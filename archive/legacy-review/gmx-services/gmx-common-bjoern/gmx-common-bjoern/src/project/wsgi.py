from cgi import parse_qs, escape

def application(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/html')])
    return ['<h1>Hello World</h1><h2>from <strong>Bjoern</strong></h2>'.encode()]
