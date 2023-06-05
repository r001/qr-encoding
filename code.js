const ethUtil = require('@ethereumjs/util')
const rlp = require('@ethereumjs/rlp')
const {Transaction, FeeMarketEIP1559Transaction} = require('@ethereumjs/tx')
const {TypedDataUtils} = require('@metamask/eth-sig-util')
const {BcUrDecoder} = require('@keystonehq/bc-ur-registry')
const {EthSignRequest, DataType, CryptoKeypath} = require('@keystonehq/bc-ur-registry-eth')
const {Common} = require('@ethereumjs/common')

const encode = (sign) => {
  const signable = JSON.parse(sign)
	const version = signable.version
	const tx = signable.payload
	const derivePath = CryptoKeypath.fromPathString(signable.derivePath)
	let EIP_1559 = true
	let xfp = "12345678";
	let rlpEncoded, common, dataType, serializedMessage, txn

  switch (signable.type) {
    case 'sign_message':
    case 'sign_personal_message':
			rlpEncoded = Buffer.from(rlp.encode(Buffer.from(signable.payload)))
			dataType = DataType.personalMessage
			break
    case 'sign_typed_data':
			rlpEncoded = Buffer.from(rlp.encode([Buffer.from(version[1], 'utf8'), Buffer.from(signable.payload, 'utf8')]))
			dataType = DataType.typedData
			break
    case 'sign_transaction':
			EIP_1559 = !tx.gasPrice	
			common = new Common({chain: tx.chainId})
			if (EIP_1559) {
				txn = FeeMarketEIP1559Transaction.fromTxData(tx, {common})
				dataType = DataType.typedTransaction
			} else {
				txn = Transaction.fromTxData(tx, {common})
				dataType = DataType.transaction
			}
			serializedMessage = txn.getMessageToSign(false)
			rlpEncoded = Buffer.from(rlp.encode(serializedMessage))
			break
		default:
			throw new Error(`Unknown signable type: ${signable.type}`)
  }
	return EthSignRequest.constructETHRequest(rlpEncoded, dataType, derivePath, xfp, signable.uuid, tx.chainId)
}

const decode = (encoded) => {
  encoded = encoded.replace(/^[^Ee]*/i, '').replace(/\s*$/, '')
  if (encoded.split(/ETHS:\/M/i).length > 1) {
		encoded = encoded.split(/ETHS:\/M/i)[1]
    return {
      type: 'sign_message',
      from_part: '0x' + encoded.substr(0, 4) +
      '..............' + encoded.substr(4, 2) +
      '................' + encoded.substr(6, 4),
      payload: '0x' + ethUtil.stripHexPrefix(encoded.slice(10))}
  }
  if (encoded.split(/ETHS:\/P/i).length > 1) {
		encoded = encoded.split(/ETHS:\/P/i)[1]
    return {
      type: 'sign_personal_message',
      from_part: '0x' + encoded.substr(0, 4) +
      '..............' + encoded.substr(4, 2) +
      '................' + encoded.substr(6, 4),
      payload: '0x' + ethUtil.stripHexPrefix(encoded.slice(10))}
  }
  if (encoded.split(/ETHS:\/[A-L]/i).length > 1) {
    var version = encoded.match(/ETHS:\/([A-L])/i)[1].charCodeAt(0) - 'A'.charCodeAt(0) + 3
		encoded = encoded.split(/ETHS:\/[A-L]/i)[1]
    return {
      type: 'sign_typed_data',
      version: 'V' + version,
      from_part: '0x' + encoded.substr(0, 4) +
      '..............' + encoded.substr(4, 2) +
      '................' + encoded.substr(6, 4),
      payload: ethUtil.stripHexPrefix(encoded.slice(10))}
  }
  if (encoded.split(/ETHS:\/T/i).length > 1) {
    encoded = encoded.split(/ETHS:\/T/i)[1]

    var errorChk = encoded
      .substr(0, 4)
      .replace(/99/g, 'n')
      .replace(/90/g, 'a')
      .replace(/91/g, 'b')
      .replace(/92/g, 'c')
      .replace(/93/g, 'd')
      .replace(/94/g, 'e')
      .replace(/95/g, 'f')
      .replace(/n/g, '9')

    errorChk = errorChk.substr(0, 2)
    
		var encErrChk = errorChk
      .replace(/9/g, '99')
      .replace(/a/g, '90')
      .replace(/b/g, '91')
      .replace(/c/g, '92')
      .replace(/d/g, '93')
      .replace(/e/g, '94')
      .replace(/f/g, '95')

    encoded = encoded.slice(encErrChk.length)
    if (errorChk !== ethUtil.bufferToHex(ethUtil.sha3(ethUtil.toBuffer(encoded))).slice(-2)) {
      console.info('Encoded:' + encoded + ' Errorchk:' + errorChk + ' Sha3: ' + ethUtil.bufferToHex(ethUtil.sha3(ethUtil.toBuffer(encoded))))
      throw new Error('Encoded data is corrupted.')
    }

    encoded = encoded
      .replace(/99/g, 'n')
      .replace(/90/g, 'a')
      .replace(/91/g, 'b')
      .replace(/92/g, 'c')
      .replace(/93/g, 'd')
      .replace(/94/g, 'e')
      .replace(/95/g, 'f')
      .replace(/96/g, '|')
      .replace(/970/g, '0000')
      .replace(/971/g, '00000')
      .replace(/972/g, '000000')
      .replace(/973/g, '000000000000')
      .replace(/974/g, '000000000000000000000000')
      .replace(/975/g, '000000000000000000000000000000000000000000000000')
      .replace(/n/g, '9')

    var typeChainVersion = ethUtil.bufferToInt(ethUtil.toBuffer('0x' + encoded.substr(0, 2)))
    version = typeChainVersion % 4
    if (version !== 0) {
      throw new Error('Unknown version:' + typeChainVersion % 4)
    }
    var type = Math.floor(typeChainVersion / 4) % 4
    if (type !== 0) {
      var typeStr
      switch (type) {
        case 1:
          typeStr = 'sign_message'
          break
        case 2:
          typeStr = 'sign_personal_message'
          break
        case 3:
          typeStr = 'sign_typed_data'
      }
      throw new Error('Signing type should be sign_transaction, instead it is ' + typeStr)
    }
    var chainIdCode = Math.floor(typeChainVersion / 16)
    var chainId
    switch (chainIdCode) {
      case 0:
        chainId = 1
        break
      case 1:
        chainId = 61
        break
      case 3:
        chainId = 2 // Morden testnet
        break
      case 4:
        chainId = 3
        break
      case 5:
        chainId = 4
        break
      case 6:
        chainId = 42
        break
      case 7:
        chainId = 77
        break
      case 9:
        chainId = 99
        break
      case 10:
        chainId = 7762959
        break
      case 8:
        chainId = null
        break
      default:
        throw new Error('Unknown chainCode(' + chainIdCode + ') proveded.')
    }
    var tx = {}
    if (chainId) tx.chainId = chainId

    tx.from_part = '0x' + encoded.substr(2, 4) +
      '..............' + encoded.substr(6, 2) +
      '................' + encoded.substr(8, 4)

    tx.to = '0x' + encoded.substr(12, 40)
    encoded = encoded.slice(52)
    if (!chainId) {
      var delimiter = encoded.search('\\|')
      chainId = encoded.substr(0, delimiter)
      encoded = encoded.slice(delimiter + 1)
    }
    try {
      tx.chainId = parseInt(chainId)
    } catch (e) {
      throw new Error('chainId should be a valid integer.')
    }
    delimiter = encoded.search('\\|')
    var nonce = encoded.substr(0, delimiter)
    encoded = encoded.slice(delimiter + 1)
    tx.nonce = '0x' + nonce

    delimiter = encoded.search('\\|')
    var gasPrice = encoded.substr(0, delimiter)
    encoded = encoded.slice(delimiter + 1)
    tx.gasPrice = '0x' + gasPrice

    delimiter = encoded.search('\\|')
    var gasLimit = encoded.substr(0, delimiter)
    encoded = encoded.slice(delimiter + 1)
    tx.gasLimit = '0x' + gasLimit

    delimiter = encoded.search('\\|')
    var value = encoded.substr(0, delimiter)
    encoded = encoded.slice(delimiter + 1)
    tx.value = '0x' + value
    tx.data = '0x' + encoded

    return {
      payload: tx,
      type: 'sign_transaction',
      from_part: tx.from_part,
    }
  }
  throw new Error('Unknown signature type.')
}

module.exports = {
  encode,
  decode,
}
