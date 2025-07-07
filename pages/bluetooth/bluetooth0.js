

var util = require('../../pages/utils/util.js');
let ReceiveData=''

import encoding from '../encode/encoding.js'	// 引入js

// // 微信开放文档关键函数 TCPSocket.onMessage()
// this.TCPClient.onMessage((res => {
// 	const arrayBuffer = res.message	// 获取通讯数据，类型为ArrayBuffer
// 	const data16 = buf2hex(arrayBuffer)	// ArrayBuffer转16进制
// 	const requestData = hexToStr(buf2hex(arrayBuffer)) // 16进制转字符串
// 	console.log(requestData)
// }))


Page({
  data: {
    DiscoveryDeviceFlag: false, // 发现标志位
    devices: [],
    deviceId: '',

    //获取设备服务
    services: [],
    serviceId: '',

    //获取设备特征值
    getBLEDeviceCharacteristics: [],
    getBLEDeviceCharacteristicsId: '',

    //接收数据为
    hexstr:'',
    balanceData:'',

  },

  onLoad() {
    /**初始化蓝牙设备 */
    setTimeout(function () {
      wx.openBluetoothAdapter({
        success: function (res) {
          console.log('初始化蓝牙成功!!!' + JSON.stringify(res)) //console显示
          wx.getBluetoothAdapterState({
            success: function (res) {
              console.log('蓝牙状态打开' + JSON.stringify(res))
            },
          })
        }
      })
    }, 100)
  },

  //获取蓝牙设备
  SearchBlueToothDevice(e) {
    console.log(e)
    let that = this
    let index = e.currentTarget.dataset.index
    let devices=this.data.devices
    // ArrayBuffer转16进度字符串示例函数
    function ab2hex(buffer) {
      var hexArr = Array.prototype.map.call(
        new Uint8Array(buffer),
        function (bit) {
          return ('00' + bit.toString(16)).slice(-2)
        }
      )
      return hexArr.join('');
    }
    setTimeout(function () {
      /**搜索蓝牙设备 */
      wx.startBluetoothDevicesDiscovery({
        services: [],
        success(res) {
          wx.onBluetoothDeviceFound(function (res) {
            console.log('new device list has founded')
            console.dir(res.devices)
          })
          wx.getBluetoothDevices({
            success: function (res) {
              console.log(res.devices)
              if (res.devices.length != 0) {
                devices=[]//清空数组
                for(let i=0;i<res.devices.length;i++){
                  if(res.devices[i].name!='未知设备'){
                    devices.push(res.devices[i])
                  }
                }
                console.log('过滤未知设备后的长度'+devices.length)
                that.setData({
                  devices: devices,
                })
              }
              wx.stopBluetoothDevicesDiscovery({
                success(res) {
                  console.log(res)
                }
              })
            }
          })
        },
      })
    }, 50)
  },

  //连接蓝牙设备
  ConnetionBlueToothDevice(e) {
    console.log(e)
    let that = this
    let index = e.currentTarget.dataset.index
    wx.createBLEConnection({
      deviceId: that.data.devices[index].deviceId, //当前被选中的ID的设备
      success(res) {
        console.log(res)
        that.setData({
          deviceId: that.data.devices[index].deviceId,
          name: that.data.devices[index].name
        })
        wx.getBLEDeviceServices({
          deviceId: that.data.devices[index].deviceId,
          success(res) {
            console.log('device services:', res.services)
            that.setData({
              services: res.services,
            })
            that.SelectBlueToolthDeviceChara(index) //回调设备当前设备特征值
          }
        })
      }
    })
  },

  //获取当前蓝牙设备可写入的特征值
  SelectBlueToolthDeviceChara(index) {
    let that = this
    let serviceId = this.data.services[0].uuid
    this.setData({
      serviceId: serviceId,
    })
    //获取服务ID特征值
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      success(res) {
        console.log('device getBLEDeviceCharacteristics:', res.characteristics)
        for (var i = 0; i < res.characteristics.length; i++) {
          if ((res.characteristics[i].properties.notify || res.characteristics[i].properties.indicate) && (res.characteristics[i].properties.write)) {
            console.log('当前蓝牙可写入的特征值 ==========', res.characteristics[i].uuid)
            that.data.getBLEDeviceCharacteristics=res.characteristics[0].uuid
            // 启用低功耗蓝牙设备特征值变化时的 notify 功能
              that.selectCharacteristics(index)
          }
        }
      }
    })
  },

  //选择特征值进行读写操作
  selectCharacteristics() {
    let that=this
    wx.notifyBLECharacteristicValueChange({
      characteristicId: this.data.getBLEDeviceCharacteristics,
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      state: true,
      success (res) {
        wx.onBLECharacteristicValueChange(function(res) {
          console.log(res.value)//res.value-->ArrayBuffer
          ReceiveData=that.hexToStr(that.buf2hex(res.value))
          console.log('接收的数据为：'+ReceiveData)
          that.setData({
            ReceiveData:ReceiveData
          })
        })
      }
    })
  },
  

/**接收数据 */
buf2hex(arrayBuffer) {
	return Array.prototype.map.call(new Uint8Array(arrayBuffer), x => ('00' + x.toString(16)).slice(-2)).join('');
},
/**
* 十六进制字符串转中文
* @param {String} hex 为十六进制字符串
* @return {String} 包含中文的字符串
*/
hexToStr(hex) {
	// 去掉字符串首尾空格
	let trimedStr = hex.trim()
	// 判断trimedStr前两个字符是否为0x，如果是则截取从第三个字符及后面所有，否则返回全部字符
	let rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr
	// 得到rawStr的长度
	let len = rawStr.length
	// 如果长度不能被2整除，那么传入的十六进制值有误，返回空字符
	if (len % 2 !== 0) {
		return ""
	}
	let curCharCode // 接收每次循环得到的字符
	let resultStr = [] // 存转换后的十进制值数组
	for (let i = 0; i < len; i = i + 2) {
		curCharCode = parseInt(rawStr.substr(i, 2), 16)
		resultStr.push(curCharCode)
	}
	// encoding为空时默认为utf-8
	let bytesView = new Uint8Array(resultStr) // 8 位无符号整数值的类型化数组
	// TextEncoder和TextDecoder对字符串和字节流互转  
	// let str = new TextDecoder(encoding).decode(bytesView)因为小程序中没有TextDecoder,经查阅资料，下载https://github.com/inexorabletash/text-encoding并const encoding = require("./text-encoding-master/lib/encoding.js")引入后使用下面方式即可：
	let str = new encoding.TextDecoder("gbk").decode(bytesView)
	return str
},




//向蓝牙设备发送信息
  SendInformation(e) {
    console.log(e)
    let that = this;
    let value = e.detail.value
    console.log('SendInformation：'+value)//字符串
    if(value.length!=0){
      console.log('发送数据长度为：'+value.length)//需要分包
      let bufferstr = new ArrayBuffer(value.length);
      bufferstr = util.hexStringToBuff(value);
      this.sendStr(bufferstr)
    }
  },

  hexCharCodeToStr(hexCharCodeStr) {
    var trimedStr = hexCharCodeStr.trim();
    var rawStr = trimedStr.substr(0, 2).toLowerCase() === '0x' ? trimedStr.substr(2) : trimedStr;
    var len = rawStr.length;
    var curCharCode;
    var resultStr = [];
    let StepLength;
    for (var i = 0; i < len;i++) {
      if(rawStr.charCodeAt(i) > 255){
        i+=2;//中文   
        StepLength=2;
      }else{
          i++;//英文
          StepLength=1;
      }  
      curCharCode = parseInt(rawStr.substr(i, StepLength), 16);
      resultStr.push(String.fromCharCode(curCharCode));
    }
    return resultStr.join('');
  },

  sendStr(bufferstr){
    let that=this
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.getBLEDeviceCharacteristics,
      value: bufferstr,
        success: function (res) {
          console.log('writeBLECharacteristicValue success', res.errMsg)
          wx.showToast({
            title: '发送成功',
          })
          console.log(this.value)//这就是要发送的数据
          
        },
    })
  },




// 断开设备连接
closeConnect() {
  let that=this
  wx.closeBLEConnection({
    deviceId: this.data.deviceId,
    success: function(res) {
      that.setData({
        devices:[],
        services:[],
        deviceId:'',
        serviceId:'',
        characteristicId: '',
      })
    }
   })
  wx.closeBluetoothAdapter({
      success: function(res) {
        console.log(res)
      },
  })
},

//end
})



