import urllib.request
import json
import base64

# Login
data = json.dumps({'email': 'testpg@test.com', 'password': 'password123'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
tokens = json.loads(response.read().decode())
access_token = tokens['access_token']

# Create a simple JPEG (using PNG data but with JPEG content-type)
png_data = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

boundary = 'boundary'
body = (
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="title"\r\n\r\n'
    'Found JPEG Item\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="category"\r\n\r\n'
    'wallets\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="description"\r\n\r\n'
    'Testing JPEG upload for found item\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="location"\r\n\r\n'
    'Found Location\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="found_date"\r\n\r\n'
    '2026-09-23\r\n'
    '--' + boundary + '\r\n'
    'Content-Disposition: form-data; name="image"; filename="found.jpeg"\r\n'
    'Content-Type: image/jpeg\r\n\r\n'
).encode('utf-8') + png_data + (
    '\r\n--' + boundary + '--\r\n'
).encode('utf-8')

req = urllib.request.Request('http://127.0.0.1:8000/found-items', data=body, headers={
    'Authorization': 'Bearer ' + access_token,
    'Content-Type': 'multipart/form-data; boundary=' + boundary
})
try:
    response = urllib.request.urlopen(req)
    print('Found JPEG Upload:', response.read().decode())
except Exception as e:
    print('Found JPEG Error:', e)