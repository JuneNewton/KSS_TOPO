"use-struct";
const fs = require("fs"),
    path = require("path"),
    KSLMQManager = require("ksl-mqtt"),
    mqOperateType = require("ksl-common").MQ_OPERATE_TYPE,
    {
        workerData: workerData,
        parentPort: parentPort,
        threadId: threadId
    } = require("worker_threads"),
    logger = require("ksl-log-helper").logger,
    logLevel = workerData.logLevel;
logger.setLevel(logLevel), logger.info("Parse Real Data Worker ID:" + threadId), otherServiceSubscribeManagerObj = void 0;
const MAIN_CONFIG_FILE = "../../Config/project_config.json";
class KSLParseRealData {
    constructor() {
        let e = JSON.parse(fs.readFileSync(path.join(__dirname, MAIN_CONFIG_FILE), "utf-8"));
        this.clientName = e.ClientName
    }
    analysisRealData(e) {
        let r = e.unhandledDataObj,
            a = e.topic,
            t = e.value;
            const recvKeysArray = [...r.keys()];
            const cacheKeysArray = [...t.keys()];
            logger.info(`===recvKeysArray: ${JSON.stringify(recvKeysArray)}`);
            logger.info(`===cacheKeysArray: ${JSON.stringify(cacheKeysArray)}`);
        try {
            for (let [e, o] of t) {
                let t = {},
                    s = [];

                logger.info(`fliter tagArray : ${JSON.stringify(o)}`);
                for (let e = 0; e < o.length; ++e)
                    if (r.has(o[e])) {
                        let a = r.get(o[e]);
                        s.push(a)
                    } if (0 !== s.length) {
                    t = s;
                    let r = {},
                        o = {};
                    o.From = this.clientName, o.RequestId = e, o.TagValues = t, r[a] = {
                        topic: a,
                        msg: o
                    }, logger.info("parse real process! send data" + JSON.stringify(r[a])), otherServiceSubscribeManagerObj.handleMQOperate(mqOperateType.PUBLISH, r[a])
                }
            }
        } catch (e) {
            logger.error("Parse Real Data Error->" + e.message)
        }
    }
}
const KSLParseRealDataObj = new KSLParseRealData;

function readInnerEMQCfg(e) {
    let r = !0;
    try {
        let a = e.ip,
            t = e.port;
        if (void 0 === a || void 0 === t) return logger.error("The Inner emqCfgFile IP or Port is Undefined! IP->" + a + " port->" + t), r = !1;
        let o = e.userName,
            s = e.password;
        otherServiceSubscribeManagerObj = new KSLMQManager(a, t, {
            username: o,
            password: s
        })
    } catch (e) {
        logger.error("Real Process Error!->" + e.message), r = !1
    }
    return r
}
parentPort.on("message", e => {
    if (e.hasOwnProperty("cfg")) {
        readInnerEMQCfg(e.cfg);
        let r = {
            topic: "collect_restart",
            msg: "needreload"
        };
        logger.info("collectServer restart! send msg to clientInterfaceServer!"), otherServiceSubscribeManagerObj.handleMQOperate(mqOperateType.PUBLISH, r)
    } else KSLParseRealDataObj.analysisRealData(e)
});