import Socks5SSProxy from "./Socks5SSProxy";
import Socks5SSProxyTcpProcess from "./Socks5SSProxyTcpProcess";

const optimistParser = require("optimist")
    .default("localPort", 3389)
    .default("localCipher", "rc4-md5")
    .default("localPassword", "123456")
    .default("socks5Addr", "127.0.0.1")
    .default("socks5Port", 1080)

    .describe("localPort", "本地Shadowsocks监听端口.")
    .describe("localCipher", "本地Shadowsocks加密方式.")
    .describe("localPassword", "本地Shadowsocks加密密码.")
    .describe("socks5Addr", "Socks5服务端地址.")
    .describe("socks5Port", "Socks5服务端端口.");
const argv = optimistParser.argv;

if (argv.help !== undefined) {
    console.log(optimistParser.help());
    process.exit(0)
}

var proxy: Socks5SSProxy = new Socks5SSProxy(argv.localPort, argv.socks5Addr, argv.socks5Port, argv.localCipher, argv.localPassword);
var processes: Array<Socks5SSProxyTcpProcess> = [];

proxy.on("clientConnected", (p: Socks5SSProxyTcpProcess) => {

    p.on("socks5Connected", () => {
        processes.push(p);
    });

    p.on("firstTraffic", (time: number) => {
        var remoteAddress: string = `${p.getRemoteAddress()}:${p.getRemotePort()}`;
        var clientAddress: string = `${p.getClientSocket().remoteAddress}:${p.getClientSocket().remotePort}`;
        console.log(`[${clientAddress}] <-> [${remoteAddress}]`);
    });

    p.on("socks5Data", (data: Buffer) => {
        
    });

    var checkedAddress = false;
    p.on("clientData", (data: Buffer) => {
        if (!checkedAddress) {
            var addressBlockList: Array<string> = [
                "api.map.baidu.com",
                "ps.map.baidu.com",
                "sv.map.baidu.com",
                "offnavi.map.baidu.com",
                "newvector.map.baidu.com",
                "ulog.imap.baidu.com",
                "newloc.map.n.shifen.com",
            ];

            for (var address of addressBlockList) {
                if (address != p.getRemoteAddress()) {
                    continue;
                }
                var remoteAddress: string = `${p.getRemoteAddress()}:${p.getRemotePort()}`;
                var clientAddress: string = `${p.getClientSocket().remoteAddress}:${p.getClientSocket().remotePort}`;
                console.log(`Client [${clientAddress}] try to connect to [${remoteAddress}].`);
                return p.clearConnect();
            }
            checkedAddress = true;
        }
    });

    p.on("close", () => {
        var index = processes.indexOf(p);
        if (index > -1) processes.splice(index, 1)
    });

    p.on("error", (err: Error) => {
        console.log(`Process Error:`, err.message);
    });
});

proxy.on("error", (err: Error) => {
    console.error("代理服务器出现错误:", err);
});

proxy.listen(() => {
    console.log(`Socks5 listening at port ${argv.localPort}.`)
});