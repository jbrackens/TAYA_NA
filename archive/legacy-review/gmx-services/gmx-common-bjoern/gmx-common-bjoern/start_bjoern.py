import bjoern
from project.wsgi import application as wsgi_application

bjoern.run(wsgi_application, '0.0.0.0', 8080)
