// Tiny logging gate for the classic game.
//
// The game used to narrate itself to the console on every fire, every spoken
// line and every page load. That chatter is useful when you are working on it
// and noise when you are not, so it now goes through ffLog() and only shows up
// when Debug is on — either the Debug option in the Options menu (which stores
// firefighterDebugMode) or ?debug=1 in the address bar.
//
// Real problems still use console.warn / console.error directly.
(function () {
    let forced = false;
    try { forced = /[?&]debug=1\b/.test(location.search); } catch (e) {}

    function enabled() {
        if (forced) return true;
        try { return localStorage.getItem('firefighterDebugMode') === 'true'; }
        catch (e) { return false; }
    }

    window.ffLog = function () {
        if (!enabled()) return;
        console.log.apply(console, arguments);
    };

    window.ffLogEnabled = enabled;
})();
