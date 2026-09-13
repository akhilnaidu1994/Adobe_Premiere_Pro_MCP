/* An OS-held loopback socket is a mutex only: it accepts no commands or data.
 * Unlike a heartbeat lease, it cannot expire while evalScript is still running.
 * A port collision fails closed. The OS releases ownership on process exit.
 */
(function(root) {
    function BridgeOwner(net, port) {
        this.net = net;
        this.port = port || 38479;
        this.server = null;
        this.owned = false;
        this.pending = false;
        this.lastAttempt = 0;
        this.error = null;
    }
    BridgeOwner.prototype.acquire = function() {
        if (this.owned || this.pending || Date.now() - this.lastAttempt < 1000) return;
        this.lastAttempt = Date.now();
        this.pending = true;
        var self = this;
        var server = this.net.createServer(function(socket) { socket.destroy(); });
        this.server = server;
        server.on('error', function(error) {
            if (self.server !== server) return;
            self.pending = false;
            self.owned = false;
            self.error = error.code || error.message;
            self.server = null;
        });
        server.on('close', function() {
            if (self.server === server) {
                self.server = null;
                self.owned = false;
                self.pending = false;
            }
        });
        server.listen({ host: '127.0.0.1', port: this.port, exclusive: true }, function() {
            if (self.server !== server) { server.close(); return; }
            self.pending = false;
            self.owned = true;
            self.error = null;
        });
    };
    BridgeOwner.prototype.release = function() {
        var server = this.server;
        this.server = null;
        this.owned = false;
        this.pending = false;
        if (server) server.close();
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = BridgeOwner;
    if (root) root.BridgeOwner = BridgeOwner;
})(typeof window !== 'undefined' ? window : null);
