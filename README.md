# snap-solid

SNAP in the browser, on top of Solid

Create the following files:

```
myCA.key
myCA.pem
myCA.srl
lolcathost.de.key
lolcathost.de.csr
lolcathost.de.crt
```

by following the instructions from
https://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate
(domain name: https://lolcathost.de).

```sh
cp lolcathost.de.key server.key
cp lolcathost.de.crt server.cert
npm install
npm test
npm run build
NODE_EXTRA_CA_CERTS=myCA.pem DEBUG=* node ./node_modules/solid-app-kit/lib/cli public/
```
