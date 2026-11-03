# BISA MAE RealWaste — CPU-only Railway backend.
# Railway service root directory MUST be /mae_backend.
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    OMP_NUM_THREADS=2 \
    OPENBLAS_NUM_THREADS=1 \
    PORT=8765

# Match a published CPU-only PyTorch + TorchVision pair. Avoid CUDA wheels.
RUN python -m pip install --no-cache-dir --timeout 120 --retries 5 \
    torch==2.6.0 torchvision==0.21.0 \
    --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt ./
RUN python -m pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt

COPY app.py download_model.py ./

# Model downloaded to the SERVER IMAGE at build time, not to visitors' devices.
# This checkpoint is approximately 1.03 GB; builds need sufficient disk/RAM.
RUN python download_model.py

EXPOSE 8765
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8765} --workers 1"]
