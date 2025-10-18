from flask import Flask

app = Flask(__name__)

@app.route('/status')
def status():
    return {'status': 'running'}

if __name__ == '__main__':
    print("Starting simple test server on port 5001")
    app.run(host='127.0.0.1', port=5001, debug=False, threaded=True)
