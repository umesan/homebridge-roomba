/**
 * homebridge-roomba
 */

let Service;
let Characteristic;

// dorita980をrequire
const dorita980 = require('dorita980');
// connect後、start()までの遅延時間を設定
const delayStartTime = 1000;
// 遅延時間を設定
const delayTime = 5000;


/**
 * Homebridgeアクセサリの初期化処理
 *
 * @param {Object} log ログ
 * @param {Object} config config.jsonのaccessoriesに指定した設定値
 * @param {String} config.name アクセサリ名
 * @param {String} config.blid Roombaのblid
 * @param {String} config.robotpwd Roombaのパスワード
 * @param {String} config.ipaddress Roombaの接続しているIP Address
 * @method roombaAccessory
 */
const roombaAccessory = function (log, config) {
  this.log = log;
  this.name = config.name;
  this.blid = config.blid;
  this.robotpwd = config.robotpwd;
  this.ipaddress = config.ipaddress;
};


/**
 * Homebridgeがキャッシュされたアクセサリを復元しようとした時に呼び出され処理
 * ここでアクセサリの各挙動を設定できます
 */
roombaAccessory.prototype = {
  /**
   * ユーザーがiOSアプリで「デバイスを識別する」をクリックしたときに呼び出される関数
   *
   * @param {Function} callback
   * @method identify
   */
  identify(callback) {
    this.log(callback);
    this.log('Identify requested!');
    callback();
  },

  /**
   * setSwitchState
   *
   * @param {Number} powerOn 0 or 1
   * @param {Function} callback
   * @method setSwitchState
   */
  setSwitchState(powerOn, callback) {
    const that = this;

    // dorita980 Local
    const roombaViaLocal = new dorita980.Local(this.blid, this.robotpwd, this.ipaddress);
    if (powerOn) {
      // 掃除をして
      that.log('Roomba Start!');

      // Roombaに接続する
      roombaViaLocal.on('connect', () => {
        that.log('Roomba Connect!');
        setTimeout(() => {
          // Roombaに掃除を開始させる
          roombaViaLocal.start().then(() => {
            that.log('Roomba is Ruuuuuuuuuunning!');

            // 実行後、公式アプリのチャンネルを解放するためにローカル接続を切断する
            roombaViaLocal.end();
            callback();
          }).catch((error) => {
            // エラー
            that.log('Roomba Failed: %s', error.message);
            that.log(error);
            callback(error);
          });
        },delayStartTime);
      });
    } else {
      // 掃除をやめて
      that.log('Roomba Pause & Dock!');
      // Roombaに接続する
      roombaViaLocal.on('connect', () => {
        that.log('Roomba Connect!');

        // Roombaの掃除を一時停止させる
        roombaViaLocal.pause().then(() => {
          that.log('Roomba is Pauuuuuuuuuuse!');
          callback();

          // Roombaの状態を取得する関数
          const checkStatus = (time) => {
            setTimeout(() => {
              that.log('Checking the Status of Roomba!');

              // Roombaの現在の状態を取得
              roombaViaLocal.getMission().then((response) => {
                that.log('Get Status of Roomba!');
                that.log(response);
                // response.cleanMissionStatus.phaseの値を見てRoombaの状況毎に処理を分岐
                switch (response.cleanMissionStatus.phase) {
                  case 'stop':
                    // RoombaをDockに戻す
                    roombaViaLocal.dock().then((() => {
                      // 実行後、公式アプリのチャンネルを解放するためにローカル接続を切断する
                      roombaViaLocal.end();
                      that.log('Roomba is Back Home! Goodbye!');
                    })).catch((error) => {
                      that.log('Roomba Failed: %s', error.message);
                      that.log(error);
                    });
                    break;
                  case 'run':
                    // Roombaが走行中の場合、遅延時間待ってから再度ステータスをチェックする
                    that.log(`Roomba is still Running... Waiting ${time}ms.`);
                    checkStatus(time);
                    break;
                  default:
                    // 実行後、公式アプリのチャンネルを解放するためにローカル接続を切断する
                    roombaViaLocal.end();
                    that.log('Roomba is not Running....You Please Help.');
                    break;
                }
              }).catch((error) => {
                that.error(error);
              });
            }, time);
          };
          // Roombaの状態を取得する
          checkStatus(delayTime);
        }).catch((error) => {
          that.log('Roomba Failed: %s', error.message);
          callback(error);
        });
      });
    }
  },


  /**
   * 一連のサービスを返す関数
   *
   * @return {Array} サービスの配列
   * @method getServices
   */
  getServices() {
    // Homekitで定義されているサービス（機能）のうちSwitchを利用する
    // Homekitで定義されているサービスの一覧は下記URLを参照
    //  - http://qiita.com/tamaki/items/cf6a09729534eae8f24b#%E3%81%A9%E3%82%93%E3%81%AAservice%E3%81%8C%E3%81%82%E3%82%8B%E3%81%8B%E3%82%92%E8%AA%BF%E3%81%B9%E3%82%8B
    const switchService = new Service.Switch(this.name);
    switchService
      // getCharacteristicは、既存のサービスと一致する名前またはテンプレートを検索し、それをオブジェクトとして返却する
      .getCharacteristic(Characteristic.On)
      // イベントにイベントリスナーを追加。
      // setイベントは、iOSが値を設定した場合や、
      // setValueというメソッドがhomebridgeで呼び出された場合に呼び出されます。
      .on('set', this.setSwitchState.bind(this));

    return [switchService];
  },
};


/**
 * export
 */
module.exports = (homebridge) => {
  // Homebridgeは内部的にHap-NodeJSというパッケージをrequireしています。
  // HAP-NodeJSは、HomeKitアクセサリサーバのNode.js実装で、
  // 独自のHomeKitアクセサリを作成するためのAPIを提供しています。

  // homebridge.hap.Serviceでは、HomeKitで定義している「とあるデバイス」の「とある機能」を提供するための雛形です。
  // homebridge.hap.Characteristicは、Serviceに割り当てられる特定の状態を定義するための雛形です。

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  // homebridge.registerAccessory(プラグイン名, プラットフォーム名, コンストラクタ名);
  homebridge.registerAccessory('homebridge-roomba', 'Roomba', roombaAccessory);
};
