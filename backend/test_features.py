import urllib.request
import json

# Test with identifying_features
data = json.dumps({'email': 'testpg@test.com', 'password': 'password123'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
tokens = json.loads(response.read().decode())
access_token = tokens['access_token']

boundary = 'boundary'
body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="title"\r\n\r\n'
    'Lost with Features\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="category"\r\n\r\n'
    'electronics\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="description"\r\n\r\n'
    'Has unique marks\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="identifying_features"\r\n\r\n'
    'Red sticker on back, scratched corner\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="location"\r\n\r\n'
    'Library\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="lost_date"\r\n\r\n'
    '2026-09-23\r\n'
    '--' + boundary + '--\r\n'
).encode('utf-8')

req = urllib.request.Request('http://127.0.0.1:8000/lost-items', data=body, headers={
    'Authorization': 'Bearer ' + access_token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary
})
try:
    response = urllib.request.urlopen(req)
    print('Create with features:', response.read().decode())
except Exception as e:
    print('Error:', e)