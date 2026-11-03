"""BISA MAE RealWaste inference API (local server; no image is saved).

The published model is a timm ViT-Base 9-class checkpoint. It cannot be
loaded using the Transformers.js CLIP classifier. We use the author's
architecture, class order, and ImageNet preprocessing recipe.
"""

from __future__ import annotations

import io
import os
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import timm
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

MODEL_ID = "ysfad/mae-waste-classifier"
MODEL_PATH = Path(os.environ.get("MAE_MODEL_PATH", Path(__file__).parent / "models" / "best_model.pth"))
MAX_IMAGE_BYTES = 8 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000

# The EXACT class sequence stated in the model's public README and config.json.
CLASSES = [
    "Cardboard", "Food Organics", "Glass", "Metal", "Miscellaneous Trash",
    "Paper", "Plastic", "Textile Trash", "Vegetation",
]
TO_BISA = {
    "Cardboard": "Kardus",
    "Glass": "Kaca",
    "Metal": "Logam",
    "Paper": "Kertas",
    "Plastic": "Plastik",
    "Miscellaneous Trash": "Sampah lainnya/residu",
}
MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)

_model: torch.nn.Module | None = None
_predict_lock = threading.Lock()


def load_checkpoint() -> torch.nn.Module:
    """Strict checkpoint load: never silently discard mismatched weights."""
    if not MODEL_PATH.is_file():
        raise RuntimeError(
            f"Checkpoint belum ditemukan: {MODEL_PATH}. "
            "Jalankan 'python download_model.py' dari folder mae_backend terlebih dahulu."
        )
    print(f"[MAE] Loading {MODEL_PATH} ({MODEL_PATH.stat().st_size / 1_000_000:.0f} MB)...", flush=True)
    start = time.perf_counter()
    # Limit CPU contention on small laptops. GPU is not required for this demo.
    torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
    model = timm.create_model("vit_base_patch16_224", pretrained=False, num_classes=9)
    # The repository stores an ordinary PyTorch dict checkpoint with optimizer
    # state; mmap avoids eagerly loading the whole 1+ GB file into RAM.
    ckpt = torch.load(str(MODEL_PATH), map_location="cpu", weights_only=True, mmap=True)
    if not isinstance(ckpt, dict):
        raise RuntimeError("Format checkpoint MAE tidak dikenal (bukan dictionary).")
    state = ckpt.get("model_state_dict", ckpt.get("state_dict", ckpt))
    if not isinstance(state, dict) or not state:
        raise RuntimeError("Checkpoint tidak memuat state_dict model.")
    if all(isinstance(k, str) and k.startswith("module.") for k in state):
        state = {k.removeprefix("module."): v for k, v in state.items()}
    # Fail loudly on any missing/unexpected key or dimensional mismatch.
    model.load_state_dict(state, strict=True, assign=True)
    model.eval()
    print(f"[MAE] Ready in {time.perf_counter() - start:.1f}s (CPU).", flush=True)
    return model


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global _model
    _model = load_checkpoint()
    yield
    _model = None


app = FastAPI(title="BISA MAE RealWaste — Inference", version="1.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ready" if _model is not None else "not_ready", "model": "MAE ViT-Base / RealWaste", "classes": 9}


def preprocess(blob: bytes) -> torch.Tensor:
    try:
        with Image.open(io.BytesIO(blob)) as input_image:
            image = ImageOps.exif_transpose(input_image).convert("RGB")
            # Matches model card: Resize((224,224)), ToTensor(), ImageNet normalization
            image = image.resize((224, 224), resample=Image.Resampling.BILINEAR)
            pixels = np.asarray(image, dtype=np.float32).copy() / 255.0
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=415, detail="File bukan gambar valid atau terlalu besar.") from error
    tensor = torch.from_numpy(pixels).permute(2, 0, 1)
    return ((tensor - MEAN) / STD).unsqueeze(0)


@app.post("/predict")
def predict(file: UploadFile = File(...)):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model MAE belum siap.")
    blob = file.file.read(MAX_IMAGE_BYTES + 1)
    if not blob or len(blob) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Foto kosong atau melebihi batas 8 MB.")

    t0 = time.perf_counter()
    input_tensor = preprocess(blob)
    preprocess_ms = (time.perf_counter() - t0) * 1000
    t1 = time.perf_counter()
    with _predict_lock, torch.inference_mode():
        logits = _model(input_tensor)
        probs = torch.softmax(logits, dim=1)[0].tolist()
    inference_ms = (time.perf_counter() - t1) * 1000

    if len(probs) != len(CLASSES):
        raise HTTPException(status_code=500, detail="Model menghasilkan jumlah kelas yang tidak sesuai.")
    order = sorted(range(len(probs)), key=lambda i: probs[i], reverse=True)
    top_name = CLASSES[order[0]]
    mapped = TO_BISA.get(top_name)
    top_matches = [
        {"label": TO_BISA.get(CLASSES[i], f"{CLASSES[i]} (di luar 6 kelas)"),
         "originalClass": CLASSES[i], "score": round(probs[i], 8)}
        for i in order[:3]
    ]
    return {
        "label": mapped or "Di luar 6 kategori BISA",
        "originalClass": top_name,
        "canUseInTransaction": mapped is not None,
        "confidence": round(probs[order[0]], 8),
        "scores": [round(p, 8) for p in probs],
        "topMatches": top_matches,
        "modelName": "MAE RealWaste (ViT-Base; 9 kelas asli)",
        "preprocessMs": round(preprocess_ms, 2),
        "inferenceMs": round(inference_ms, 2),
        "classes": CLASSES,
    }
