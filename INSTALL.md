# Installing

To install the QR coding software:<br>
`git clone https://github.com/r001/qr-encoding.git` <br>
`cd qr-encoding`<br>
`npm install`<br>

# Running

To encode run the following:

`node index.js e <json>`

To decode please run:
`node index.js d <uri>`

# Examples

Encoding:

`node index.js e '{"payload":{"chainId":1,"from":"0x23f41234567123456785123456781234567825ce","to":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2","nonce":"0x2d","gasPrice":"0x0165a0bc0
0","gasLimit":"0xa617","value":"0x016345785d8971","data":"0xd0e30db0"},"type":"sign_transaction","from":"
0x23f41234567123456785123456781234567825ce"}'`

Will result:

`eths:/?t=78002395485259294920290909039991223959489309009459249527949093990839275692922293960165900919200969061796016345785938997196930943093910`

To decode above:

`node index.js d eths:/?t=780023954852592949202909090399912239594893090094592
49527949093990839275692922293960165900919200969061796016345785938997196930943093910`

It will result:

`{"payload":{"chainId":1,"from_part":"0x23f4..............85................25ce","to":"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2","nonce":"0x2d","gasPrice":"0x0165a0bc00","gasLimit":"0xa617","value":"0x016345785d8971","data":"0xd0e30db0"},"type":"sign_transaction","from_part":"0x23f4..............85................25ce"}`

Notice, that the from: field is gone, and we have a from_part: instead. The reason for this is that the signer can find out the from address from from_part by matching it to his available addresses. By not disposing the entire from: field, 30 characters from QR code can be saved.
