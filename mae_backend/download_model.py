"""One-time download of the published MAE RealWaste checkpoint (~1.03 GB)."""
from pathlib import Path
from huggingface_hub import hf_hub_download

model_dir = Path(__file__).resolve().parent / "models"
model_dir.mkdir(parents=True, exist_ok=True)
print("Downloading MAE RealWaste checkpoint (~1.03 GB). This is needed once.", flush=True)
filename = hf_hub_download(
    repo_id="ysfad/mae-waste-classifier",
    filename="best_model.pth",
    local_dir=str(model_dir),
)
print(f"Model ready: {filename}", flush=True)
