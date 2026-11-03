# Python inference service for BISA MAE RealWaste

Run the commands in the repository's root README. Python 3.11 suggested.

The model is a **9-class** ViT-Base stored as `best_model.pth`. `download_model.py` downloads the published checkpoint once (~1.03GB). The backend uses strict `timm` state_dict loading, no fine-tuning, and responds with all nine scores and top-three classes. It never saves input photos.

A model failing to load must not be presented as a working classifier. Inspect terminal errors.
