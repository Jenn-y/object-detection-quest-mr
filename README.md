## Object Detection in Mixed Reality with Quest 3

This prototype was developed during 2nd semester of IMLEX (Erasmus Mundus Master's degree Imaging and Light in Extended Reality) at University Jean-Monnet in  France.

Team: **Dženita Đulović, Daniil Brodt**

## Instructions

Prototype has several segments to setup before testing.

Firstly, **scrcpy** for accessing the camera of Quest 3:
1. Download and build scrcpy from this PR: [https://github.com/Genymobile/scrcpy/pull/4658](https://github.com/Genymobile/scrcpy/pull/4658), for example, as follows:
	1. git clone https://github.com/Genymobile/scrcpy.git
	2. cd scrcpy
	3. gh pr checkout 4658
	4. ./install_release.sh
2. Connect your machine and Quest 3 with the cable and allow USB debugging
3. Use the following command to run the scrcpy:
    ``scrcpy --crop=2064:2208:2064:0 --window-title='Quest3Cast' --rotation-offset=-21 --scale=195 --position-x-offset=-420 --position-y-offset=-490 --video-bit-rate=16M -f``

Next, run **Python server** with **YOLO-World** model:
1. Create new conda environment
2. Activate conda environment
3. Run `conda install -c pytorch -c nvidia -c conda-forge pytorch torchvision ultralytics flask flask-socketio python-dotenv` in terminal
4. Run `python main.py` to start the server
5. Create `.env` file and copy the content of `.env.dist` file (change the values as needed to match your server settings)
Note: additional package installs might be necessary.

Setup **ngrok** for secure communication with the Python server (necessary since Meta browser only supports https communication):
1. Create an account on ngrok and follow the installation guidelines
2. Add the authorization token
3. Modify the config file (`ngrok config edit`) by adding the following below authorization token:
```
	tunnels:
		http:
   			addr: 192.168.208.249:5003 (change to your python server)
   			proto: http
   			host_header: rewrite
   		tcp:
   			addr: 192.168.208.249:5003 (change to your python server)
   			proto: tcp
```
4. Run ngrok: `ngrok start --all`
5. Use the obtained ngrok https url and paste it as a link in api variable in `index.js`

**Web application** for the mixed reality experience is built with **ThreeJS**. To run it:
1. Install Five Server extension to Visual Studio Code
3. Start the server (config file is present in the root folder)
4. Make sure that the headset and the server are on the same network

With everything running, you can open the website url in Meta Quest 3 browser and enjoy object detection in mixed mixed-reality environment.
