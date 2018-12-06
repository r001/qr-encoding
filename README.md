# QR transaction-, and message signing encoding rules

The purpose of this document is to describe an efficient way of encoding Ethereum transactions in order to be transmitted over using QR codes. Since the amount of data to be transmitted is very limited we apply simple compression, and create numeric codes, since it is more effectively transmittable busing QR codes.

## Message signing 

In case of message signing, since there is no limitation of message bytes, we use no special encoding. 
The following table displays the simple encoding we use:


|0-1 digits  | 2-3 digits               | n digits message | 
|------------|--------------------------|------------------|
|error check | Signature type + version | message bytes    |

Error check = rightmost 2 digits of the sha3(signature + version + message bytes)

- Signable messages will not be encoded or compressed. 
- Typed messages must follow the json encoding standard.

## Transaction encoding 

1. Encode from left to right the 0 th digit is the leftmost digit.
2. The final data to be transmitted contains only numbers, no letters or special characters.
3. Digit 9 is used as an escape number to escape 9, a-f characters, delimiter, and compression encoding.
   The reason for this is that QR codes allow 1.6 times more numeric than alphanumeric characters.
4. Since ethereum transactions use a lot of zeros, we use compression for zeros. 
5. We encode the from address in a way that we use its leftmost 4 hex digits (digits 0-3) the the 'middle' two digits (digits 18-19), and then the rightmost 4 digits (digits 36-39) are concatenated. Since signer must know the from address, we can spare digits by using only parts.
6. We put together the transaction to be encoded the following way:

|0-1 digits  | 2-3 hex digits                      | 4-13. digits             |  14-53. digits |
|------------|-------------------------------------|--------------------------|----------------|
|error check | Signature type + chain id + version | from address (only part) | to address     |


| n digits delimited (only present if not encoded in 0-1 digits) | delimiter                          |
|----------------------------------------------------------------|------------------------------------|
| chainId (only if was not encoded into the 2-3 digits)          | (if chainId was encoded before)    |

| n digits delimited | delimiter | n digits delimited | delimiter | 
|--------------------|-----------|--------------------|-----------| 
| nonce              |           |  gasPrice          |           |

| n digits delimited | delimiter | n digits delimited | delimiter |  
|--------------------|-----------|--------------------|-----------| 
| gasLimit           |           |  value             |           |

| n digits |
|----------|
| data     |

Error check = rightmost 2 digits (9 escaped - see later) of the sha3(encoded, escaped and compressed full data) 

### 9 Escaping and zero compression:

#### 9 Escaping 

1. First the alphanumeric code will be escaped with digit 9 in order to remove letters a-f and delimiters between variable length fields. 

|Hex digit to encode  | Encoded digit | Meaning                                 |
|---------------------|---------------|-----------------------------------------|
| a                   | 90            |                                         |
| b                   | 91            |                                         |
| c                   | 92            |                                         |
| d                   | 93            |                                         |
| e                   | 94            |                                         |
| f                   | 95            |                                         |
| \|                  | 96            | delimiter between variable length data  |
| zero compression    | 97            | compress zeros (see later)              |
| reserved, do not use| 98            |                                         |
| 9                   | 99            |                                         |

The rationale of this step is that QR codes can transmit 1.6 times more numeric, than alphanumeric data. We are still better off with escaping, than with using alphanumeric mode.

#### Zero compression

The reason of zero compression is to compress the many zeros in ethereum transactions, arising because of 0 padding.


| To encode                             |      Encoded     |
|---------------------------------------|------------------|
| 0000                                  |        970       |
| 00000                                 |        971       |
| 000000                                |        972       |
| 000000000000                          |        973       |
| 000000000000000000000000              |        974       |
| 0 x 48 (fourtyeight zeros)            |        975       |
| reserved, do not use                  |        976       |
| reserved, do not use                  |        977       |
| reserved, do not use                  |        978       |
| do not use                            |        979       |

Eg.: to encode 0x0000000000000000000000000000002a hex, we first remove the '0x' from the beginning, 
then  excape  the 9-f digits. So we end up with: 000000000000000000000000000000290, then we do the zero compressing: 
we would start from the left and check what is the biggest 0 chunk we can compress. That will be 24 zeros 
since that is the biggest chunk we can compress at once. And the next would be 6 more zeros.
so the encoded hex would be: 974972290 th This is much shorter than the original, and contains only numbers.
 
### Transaction and message signing 

2-3 digits encoded in hex, and then 9 escaped. This contains the Protocol version encoding, the signing type and the chainId. 

#### Protocol version encoding

0-1 bits (lowest bits): Protocol version

| Code (hex)       | Meaning         |
|------------------|-----------------|
| ``0``            | Current version |
| ``1-3``          | Future versions |

#### Signing type encoding

2-3 bits: signing type

| Code (hex)       | Meaning               |
|------------------|-----------------------|
| ``0``            | sign_transaction      |
| ``1``            | sign_message          |
| ``2``            | sign_personal_message |
| ``3``            | sign_typed_data       |

#### ChainId encoding

4-7 bits: ChainId

| Code (hex)       | Meaning                                                                      |
|------------------|------------------------------------------------------------------------------|
| ``0``            | 1: Frontier, Homestead, Metropolis, the Ethereum public main network         |
| ``1``            | 1: Classic, the (un)forked public Ethereum Classic main network, chain ID 61 |
| ``2``            | 1: Expanse, an alternative Ethereum implementation, chain ID 2               |
| ``3``            | 2: Morden, the public Ethereum testnet, now Ethereum Classic testnet         |
| ``4``            | 3: Ropsten, the public cross-client Ethereum testnet                         | 
| ``5``            | 4: Rinkeby, the public Geth PoA testnet                                      |
| ``6``            | 42: Kovan, the public Parity PoA testnet                                     |
| ``7``            | 77: Sokol, the public POA Network testnet                                    |
| ``8`` (!!!)      | chainId encoded starting in the 54 th digit, and not here!!!!                |
| ``9``            | 99: Core, the public POA Network main network                                |
| ``a``            | 7762959: Musicoin, the music blockchain                                      |
| ``a-f``          | reserved                                                                     |

Eg.: 
- To sign a transaction on mainnet: 0 th byte is be 0 (version code) + 0 (sign transaction) * 4 + 16 * 0 (chain id = 0)  = 0x00 
- To sign a transaction on Kovan: 0 th byte is  0 (version code) + 0 (sign transaction) * 4 + 16 * 6 (code of kovan) = 0x30 
- To sign a message on kovan: 0 th byte is  0 (version code) + 1 (sign message) * 4 + 16 * 6 (code of kovan) = 0x34 

### A complete example

Let's start with the following th json data:

``{"type":"sign_transaction": <br>
"from":"0x1204d2a2f9a823c1a585fde6514a17ff695e0001",<br>
"to":"0xb2565129883cfffe21a88eeafaa3ccd9ec5f6539",<br>
"chainId":"1",<br>
"nonce":"0x2d",<br>
"gasPrice":"0x0165a0bc00",<br>
"gasLimit":"0x5208",<br>
"value":"0x68155a43676e00000",<br>
"data":"0x000000000000000000000000000000af00000000000000000000000023ff99"}<br>``

#### Transaction encoding example

0. Put together the tx in the following way

``1204d2a2f9a823c1a585fde6514a17ff695e0001b2565129883cfffe21a88eeafaa3ccd9ec5f65392d|0165a0bc00|5208|68155a43676e00000|000000000000000000000000000000af00000000000000000000000023ff99``

Notice: 
- that the chain id has been removed, since it will be encoded in two hex digits and to to the left of the string above.
- that there is NO delimiter before the to address. This is because to the left from to address, all the values are of fixed lenth.
- that there is NO delimiter before nonce. This is because to the left from nonce, all the values are of fixed lenth.

1. Keep only the lefmost 4, 18-19 th (counting from 0 th) , and the rightmost 4 digits from the from address to get:

``1204850001b2565129883cfffe21a88eeafaa3ccd9ec5f65392d|0165a0bc00|5208|68155a43676e00000|000000000000000000000000000000af00000000000000000000000023ff99``

2. Create the two digits for version + sign type + chain id 

0 (version) + 4 * 0 (sign_transaction) + 16 * 0 (chain id code) = 00 

We get:

``001204850001b2565129883cfffe21a88eeafaa3ccd9ec5f65392d|0165a0bc00|5208|68155a43676e00000|000000000000000000000000000000af00000000000000000000000023ff99``

3. 9 escape the digits 9-f

``00120485000191256512998839295959594219088949490959090392929399949259565399293|0165900919200|5208|6815590436769400000|00000000000000000000000000000090950000000000000000000000002395959999``

Notice that after 9 escaping there should be no a-f in the code.

4. 9 escape the delimiters

The code of the delimiters is 96 so we end up:

``001204850001912565129988392959595942190889494909590903929293999492595653992939601659009192009652089668155904367694000009600000000000000000000000000000090950000000000000000000000002395959999``

5. Do zero compression:

Since we have a 24 length of zeroes in the code (we substitute that with code of 974) the intermediate encoding is this:

``001204850001912565129988392959595942190889494909590903929293999492595653992939601659009192009652089668155904367694000009697400000090959742395959999``

Since there is a 6 length of zeroes (encoded 972) we can further compress it to have:

``001204850001912565129988392959595942190889494909590903929293999492595653992939601659009192009652089668155904367694000009697497290959742395959999``

Since there is still a 5 length of zeroes (encoded 971) we can substitute:

``0012048500019125651299883929595959421908894949095909039292939994925956539929396016590091920096520896681559043676949719697497290959742395959999``

There is no 4 zeros to substitute, so we stop zero compression.

6. We get the sha3 (keccak 256) of the previous data to treating it as hex.

``sha3(0x0012048500019125651299883929595959421908894949095909039292939994925956539929396016590091920096520896681559043676949719697497290959742395959999) = 34787a5c78d1ce7077a2723a945f41ada69a102add88ef3ddcede8377234babf``

The rightmost two digits are bf.

7. We 9 escape bf to get 9195. This goes to the left end of our data. So we get the end result of:

``91950012048500019125651299883929595959421908894949095909039292939994925956539929396016590091920096520896681559043676949719697497290959742395959999``

So from a 308 bytes long of byte data we got a 146 long of numeric data.

#### Transaction decoding example

To decode the above we do the following:

1. We take the leftmost two digits, if it starts with 9 then we take the next digit, if that is nine too, we take the next one. The 0 th digit is 9 so we take the next one which is 1,and 91 decodes to 'b'. Then we take the next digit whic is 9 and then the next one which is 5 , so we decode 95 to 'f'. So the error check byte is bf. 

2. We calculate the sha3 of the remaining code taken as hex to calculate:
``sha3(0012048500019125651299883929595959421908894949095909039292939994925956539929396016590091920096520896681559043676949719697497290959742395959999) = 34787a5c78d1ce7077a2723a945f41ada69a102add88ef3ddcede8377234babf``

The rightmost two digits bf match with the error check code of bf, so we are fine. (If not then the QR code we read was probably wrong.)

3. We 9 unescape the code. 
!!!!!This should be the first unescape. Otherwise the code will be wrong!!!!!

First we mark all 99 in the code to get:
``00120485000191256512m88392959595942190889494909590903929293m9492595653m2939601659009192009652089668155904367694971969749729095974239595mm``

4. Zero decompress the code, meaning search for 970-975 codes and replace them with corresponding zeros.

We found 971 in the code and replaced that with 5 zeros to get:

``00120485000191256512m88392959595942190889494909590903929293m9492595653m293960165900919200965208966815590436769400000969749729095974239595mm``

We found 972 in the code and converted it to 000000 to get:

``00120485000191256512m88392959595942190889494909590903929293m9492595653m293960165900919200965208966815590436769400000969740000009095974239595mm``

We found 974 in the code and converted it to 24 x 0  to get:

``00120485000191256512m88392959595942190889494909590903929293m9492595653m293960165900919200965208966815590436769400000960000000000000000000000000000009095000000000000000000000000239595mm``

We found no code of 975 so we are done with decompression.
 
5. We 9 unescape the code. 

Unescape the delimiters (encoded 96):

``00120485000191256512m88392959595942190889494909590903929293m9492595653m293|0165900919200|5208|6815590436769400000|0000000000000000000000000000009095000000000000000000000000239595mm``

Then decode 90-95 to get a-f:

``001204850001b256512m883cfffe21a88eeafaa3ccdmec5f653m2d|0165a0bc00|5208|68155a43676e00000|000000000000000000000000000000af00000000000000000000000023ffmm``

Then substitute 9 instead of 'm':

``001204850001b2565129883cfffe21a88eeafaa3ccd9ec5f65392d|0165a0bc00|5208|68155a43676e00000|000000000000000000000000000000af00000000000000000000000023ff99``

Notes:
- Lets check the leftmost two digits. Since it is 00 we know that we got a version 0, and we must sign a transaction. 
- Since the chainId was encoded 0 which means we are signing an Ethereum mainnet tx. That also means that the 2d does not represent a chainId (since it was already encoded in the 2-3 hex digit). If we had received a 2-3 hex digit of 18 this is dedimal 24. Since 24 % 16 = 8, this would mean that the chainId was not encoded in the 2-3 digits, but is encoded after the to address starting at 54 th digit. 
- The from address can be easily determined at signer from digits 2-11 by comparing corresponding digits. 
