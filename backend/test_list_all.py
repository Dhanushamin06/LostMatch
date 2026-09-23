import urllib.request
import json

# Login
data = json.dumps({'email': 'testpg@test.com', 'password': 'password123'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
response = urllib.request.urlopen(req)
tokens = json.loads(response.read().decode())
access_token = tokens['access_token']

# Test list lost items
req = urllib.request.Request('http://127.0.0.1:8000/lost-items', headers={'Authorization': 'Bearer ' + access_token})
response = urllib.request.urlopen(req)
items = json.loads(response.read().decode())
print('Lost Items:', len(items))
for item in items:
    print('  ' + str(item['id']) + ': ' + item['title'] + ' - ' + item['category'] + ' - ' + item['location'] + ' - ' + item['lost_date'])

# Test list found items
req = urllib.request.Request('http://127.0.0.1:8000/found-items', headers={'Authorization': 'Bearer ' + access_token})
response = urllib.request.urlopen(req)
items = json.loads(response.read().decode())
print('Found Items:', len(items))
for item in items:
    print('  ' + str(item['id']) + ': ' + item['title'] + ' - ' + item['category'] + ' - ' + item['location'] + ' - ' + item['found_date'])