const ethUtil = require('ethereumjs-util')

const encode = (sign) => {
  const signable = JSON.parse(sign)
  const fromAddress = ethUtil.stripHexPrefix(signable.from)

  const partFrom = fromAddress.substr(0, 4) +
    fromAddress.substr(18, 2) + fromAddress.slice(-4)
  
	const v = signable.version
  var y
	const tx = signable.payload
	var chainId = tx.chainId
	var chainCode
	var esc9, zeroCompStr, numStr
  switch (signable.type) {
    case 'sign_message':
      return 'ETHS:/M' + partFrom + ethUtil.stripHexPrefix(signable.payload)
    case 'sign_personal_message':
      return 'ETHS:/P' + partFrom + ethUtil.stripHexPrefix(signable.payload)
    case 'sign_typed_data':
      // version V3: a
      // version V4: b
      // version V5: c
      // ...
      y = String.fromCharCode('A'.charCodeAt(0) + v.charCodeAt(1) - '3'.charCodeAt(0))
      return 'ETHS:/' + y + '=' + partFrom + ethUtil.stripHexPrefix(signable.payload)
    case 'sign_transaction':
      switch (chainId) {
        case 1:
          chainCode = 0
          break
        case 61:
          chainCode = 1
          break
        case 2:
          chainCode = 3 // Morden testnet
          break
        case 3:
          chainCode = 4
          break
        case 4:
          chainCode = 5
          break
        case 42:
          chainCode = 6
          break
        case 77:
          chainCode = 7
          break
        case 99:
          chainCode = 9
          break
        case 7762959:
          chainCode = 10
          break
        default:
          chainCode = 8
          break
      }
      var signingType = 0
      var signChainVersion = ethUtil.stripHexPrefix(ethUtil.intToHex(signingType * 4 + chainCode * 16))
      var flatStr = signChainVersion + partFrom
      flatStr += ethUtil.stripHexPrefix(tx.to)
      flatStr += chainCode === 8 ? chainId.toString() + '|' : ''
      flatStr += ethUtil.stripHexPrefix(tx.nonce) + '|'
      flatStr += ethUtil.stripHexPrefix(tx.gasPrice) + '|'
      flatStr += ethUtil.stripHexPrefix(tx.gasLimit) + '|'
      flatStr += ethUtil.stripHexPrefix(tx.value) + '|'
      flatStr += ethUtil.stripHexPrefix(tx.data)
      flatStr = flatStr.toLowerCase()

      esc9 = flatStr.replace(/9/g, 'n')

      // zero compressing
      zeroCompStr = esc9.replace(/0{48}/g, '975').replace(/0{24}/g, '974').replace(/0{12}/g, '973').replace(/0{6}/g, '972').replace(/0{5}/g, '971').replace(/0{4}/g, '970')

      // escape all '9' in flat string
      numStr = zeroCompStr
        .replace(/n/g, '99')
        .replace(/a/g, '90')
        .replace(/b/g, '91')
        .replace(/c/g, '92')
        .replace(/d/g, '93')
        .replace(/e/g, '94')
        .replace(/f/g, '95')
        .replace(/\|/g, '96')

      var errorChk = ethUtil.stripHexPrefix(ethUtil.bufferToHex(ethUtil.sha3(ethUtil.toBuffer(numStr))).slice(-2))

      // error check
      errorChk = errorChk
        .replace(/9/g, '99')
        .replace(/a/g, '90')
        .replace(/b/g, '91')
        .replace(/c/g, '92')
        .replace(/d/g, '93')
        .replace(/e/g, '94')
        .replace(/f/g, '95')

      return 'ETHS:/T' + errorChk + numStr
  }
}

const decode = (encoded) => {
  encoded = encoded.replace(/^[^E]*/, '').replace(/\s*$/, '')
  if (encoded.split('ETHS:/M').length > 1) {
    return {
      type: 'sign_message',
      from_part: '0x' + encoded.substr(9, 4) +
      '..............' + encoded.substr(13, 2) +
      '................' + encoded.substr(15, 4),
      payload: '0x' + ethUtil.stripHexPrefix(encoded.slice(19))}
  }
  if (encoded.split('ETHS:/P').length > 1) {
    return {
      type: 'sign_personal_message',
      from_part: '0x' + encoded.substr(9, 4) +
      '..............' + encoded.substr(13, 2) +
      '................' + encoded.substr(15, 4),
      payload: '0x' + ethUtil.stripHexPrefix(encoded.slice(19))}
  }
  if (encoded.split(/ETHS:\/\?[A-L]=/).length > 1) {
    var version = encoded.match(/ETHS:\/\?([A-L])=/)[1].charCodeAt(0) - 'A'.charCodeAt(0) + 3
    return {
      type: 'sign_typed_data',
      version: 'V' + version,
      from_part: '0x' + encoded.substr(9, 4) +
      '..............' + encoded.substr(13, 2) +
      '................' + encoded.substr(15, 4),
      payload: '0x' + ethUtil.stripHexPrefix(encoded.slice(19))}
  }
  if (encoded.split('ETHS:/T').length > 1) {
    encoded = encoded.split('ETHS:/T')[1]

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
