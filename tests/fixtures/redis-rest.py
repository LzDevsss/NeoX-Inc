"""Redis simulado local com execução Lua, exclusivo dos testes; sem dados reais."""
import sys, os, json, time, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import fakeredis
original_time = time.time
offset = 0
time.time = lambda: original_time() + offset
database = fakeredis.FakeStrictRedis(decode_responses=True)
lock = threading.RLock()
class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        global offset
        try:
            command = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            with lock:
                if isinstance(command, dict) and '__advance' in command:
                    offset += command['__advance'] / 1000
                    result = True
                else:
                    result = database.execute_command(*command)
            encoded = json.dumps({'result': result}, ensure_ascii=False).encode()
        except Exception as error:
            encoded = json.dumps({'error': str(error)}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
    def log_message(self, *args):
        pass
class Server(ThreadingHTTPServer):
    request_queue_size = 128
port = int(sys.argv[1]) if len(sys.argv) > 1 else 6381
print('Redis/Lua ready', flush=True)
Server(('127.0.0.1', port), Handler).serve_forever()
