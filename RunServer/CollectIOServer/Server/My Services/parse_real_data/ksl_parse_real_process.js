"use-struct";
const path = require("path"),
    {
        Worker: Worker
    } = require("worker_threads"),
    logger = require("ksl-log-helper").logger;
let heartStatus = 0;
const WORKER_THREAD_NUM = 1;
let topicInfoMap = new Map,
    requstIdCountMap = new Map,
    logLevel = "info";

function createAllWorkerObj() {
    for (let e = 0; e < WORKER_THREAD_NUM; ++e) createSingleWorkerObj(e)
}

function createSingleWorkerObj(e) {
    if (e < 0 || e > WORKER_THREAD_NUM) return void logger.error("Parse Real Process: ID out of the Limit Value->" + e);
    let r = {};
    r.logLevel = logLevel, worker[e] = new Worker(path.join(__dirname + "/ksl_parse_real.js"), {
        workerData: r
    }), worker[e].on("error", r => {
        logger.error("Parse Real Worker Error! ID->" + e + " Error->" + r), createSingleWorkerObj(e)
    }), worker[e].on("exit", r => {
        logger.warn("Parse Real Worker Exit! ID->" + e + " Code->" + r)
    })
}

function removeTopicInfo(e) {
    topicInfoMap.has(e) && topicInfoMap.delete(e)
}
worker = [], process.on("SIGTERM", e => {
    logger.warn(`Real process recv signal:${e}`), process.exit()
}), process.on("message", e => {
    if ("object" == typeof e)
        if (e.hasOwnProperty("cfg")) {
            logLevel = e.logLevel, logger.setLevel(logLevel), createAllWorkerObj();
            for (let r = 0; r < WORKER_THREAD_NUM; ++r) worker[r].postMessage(e)
        } else if (e.hasOwnProperty("heartbeat")) "pong" === e.heartbeat && (heartStatus = 0, logger.debug("alarm process rec pong"));
    else {
        let r = e.topic,
            o = e.msg,
            t = new Map;
        for (let e = 0; e < o.length; ++e) t.set(o[e].N, o[e]);
        if (r.startsWith("realtime/"))
            if (r.includes("realtime/unsubscribe")) {
                let e = o.RequestId;
                if (void 0 === e) return void logger.error("Unsubscribe RequestId is undefined!");
                let r = 0;
                
                // niudun.zhu
                const stack = (new Error()).stack;
                requstIdCountMap.has(e) && (r = requstIdCountMap.get(e), r--, requstIdCountMap.set(e, r)), logger.info(new Date + "Unsubscribe requestId->" + e + " curCount:" + r), logger.debug("Unsubscribe requestId->" + e);
                for (let [o, t] of topicInfoMap) t.has(e) && r <= 0 && (t.delete(e), requstIdCountMap.delete(e))
            } else if (r.includes("realtime/subscribe")) {
            logger.info("采集服务子线程收到精准订阅", r);
            let e = o.From,
                t = o.RequestId;
            if (void 0 === e || void 0 === t) return void logger.error("The Subscribe From or RequestId is undefined!");
            let s = o.Tags;
            if (!Array.isArray(s)) return void logger.error("The Tags is not Array!");
            if (requstIdCountMap.has(t)) {
                let e = requstIdCountMap.get(t);
                e++, requstIdCountMap.set(t, e), logger.debug(new Date + "subscribe requestId->" + t + " curCount:" + e)
            } else requstIdCountMap.set(t, 1), logger.debug(new Date + "第一次订阅" + t);
            let a = new Map;
            topicInfoMap.has(e) && (a = topicInfoMap.get(e)), a.set(t, s), console.log("addTopicInfo topic => " + r + " From->" + e + " RequestId->" + t + " Data->" + s), topicInfoMap.set(e, a)
        } else r.includes("realtime/realtime_clienterfacestart") ? (logger.debug(new Date + "接口服务启动，复位map-》requstIdCountMap"), requstIdCountMap.clear()) : logger.error("There is no this topic->" + r);
        else {
            logger.info("parse real process! recv data" + JSON.stringify(e));
            for (let [e, r] of topicInfoMap) {
                let o = {};
                o.unhandledDataObj = t, o.topic = e, o.value = r;
                let s = Math.floor(Math.random() * WORKER_THREAD_NUM);
                worker[s].postMessage(o)
            }
        }
    }
}), setInterval(() => {
    5 < (heartStatus += 1) && process.exit(), process.send({
        heartbeat: "ping"
    })
}, 1e4);