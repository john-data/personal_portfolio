import http.client

conn = http.client.HTTPSConnection("covid-19-data.p.rapidapi.com")

headers = {
    'x-rapidapi-key': "050eb41d47mshfcc5e8ea511ca06p119d13jsn715975fbb0e7",
    'x-rapidapi-host': "covid-19-data.p.rapidapi.com"
    }

conn.request("GET", "/totals", headers=headers)

res = conn.getresponse()
data = res.read()

print(data.decode("utf-8"))