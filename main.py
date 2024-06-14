from flask import Flask, request, jsonify
from ultralytics import YOLO
import numpy as np
from PIL import Image
import os
from flask_socketio import SocketIO
from flask_cors import CORS
import subprocess
from dotenv import load_dotenv
import os


load_dotenv()


port = os.getenv('PORT')
app = Flask(__name__, static_folder='static')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


model = YOLO("yolov8l-world.pt")
with open('prompts.txt', 'r') as f:
    classes = [line.strip() for line in f]
# model.set_classes(classes)
model.set_classes(["monitor", "bottle", "smartphone", "glasses", "pen", "wallet", "cup"])


@app.before_request
def before_request_func():
    if request.method == 'OPTIONS':
        return '', 200


@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image_file = request.files['image']
    image = Image.open(image_file.stream).convert('RGB')
    
    results = model.predict(np.array(image), conf=0.2)
    
    output = []
    for box in results[0].boxes:
        xyxy = box.xyxy[0].tolist()
        output.append({
            "class": int(box.cls.item()),
            "name": model.names[int(box.cls.item())],
            "bbox": xyxy,
            "confidence": float(box.conf.item())
        })
    
    # result_image = Image.fromarray(results[0].plot())
    # result_image.show()
    # result_image.save("./result.jpg")

    socketio.emit('new_prediction', output)
    print(output)
    return jsonify({"status": "Prediction processed and sent to client"})


@app.route('/run-script', methods=['GET'])
def run_script():
    try:
        subprocess.Popen(['bash', './integration.sh'])
        return jsonify({"status": "Script execution started", "code": 200})
    except Exception as e:
        return jsonify({"error": str(e), "code": 500})
    

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=int(port))
