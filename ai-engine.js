/* =====================================================
   FCO Auto Upgrade PRO V2.2 - AI ENGINE
   RATE ENGINE: Tail-3 Admin Match (3 số cuối khớp dây admin)
   Công thức additive từ 2.0 — bỏ hoàn toàn soi cầu bệt
   ===================================================== */
var AIEngine = {

    // ============================================================
    //  TÍNH TỈ LỆ: TAIL-3 ADMIN MATCH
    //  So sánh 3 số cuối user mồi với dây admin đã up
    //  VD: admin="1332453", user="1544111453"
    //      tail3 user = "453", tail3 admin = "453" → MATCH!
    // ============================================================
    analyzeTail3Match: function(userDigits, adminSequences) {
        if (!userDigits || userDigits.length < 2) {
            return { score: 0, matched: false, matchCount: 0 };
        }

        var len = userDigits.length;
        var userTail3 = userDigits.slice(-3);
        var userTail2 = userDigits.slice(-2);

        var bestScore = 0;
        var matchCount = 0;

        if (!adminSequences || adminSequences.length === 0) {
            return { score: 0, matched: false, matchCount: 0 };
        }

        for (var s = 0; s < adminSequences.length; s++) {
            var parts = adminSequences[s].trim().split('=');
            var root = parts[0].split('').map(Number);
            var rootLen = root.length;
            if (rootLen < 2) continue;

            var adminTail3 = root.slice(-3);
            var adminTail2 = root.slice(-2);

            // --- Khớp 3 số cuối CHÍNH XÁC ---
            if (len >= 3 && rootLen >= 3 &&
                userTail3[0] === adminTail3[0] &&
                userTail3[1] === adminTail3[1] &&
                userTail3[2] === adminTail3[2]) {
                matchCount++;
                var sc = 32 + Math.min(matchCount * 3, 10);
                if (sc > bestScore) bestScore = sc;
                continue;
            }

            // --- Khớp 3 số cuối GẦN ĐÚNG (±1) ---
            if (len >= 3 && rootLen >= 3) {
                var nearMatch = Math.abs(userTail3[0] - adminTail3[0]) <= 1 &&
                                Math.abs(userTail3[1] - adminTail3[1]) <= 1 &&
                                Math.abs(userTail3[2] - adminTail3[2]) <= 1;
                if (nearMatch) {
                    var sc = 18;
                    if (sc > bestScore) bestScore = sc;
                    continue;
                }
            }

            // --- 3 số cuối user xuất hiện LIÊN TIẾP trong dây admin ---
            if (len >= 3 && rootLen >= 4) {
                for (var i = 0; i <= rootLen - 3; i++) {
                    if (root[i]   === userTail3[0] &&
                        root[i+1] === userTail3[1] &&
                        root[i+2] === userTail3[2]) {
                        var sc = 20;
                        if (sc > bestScore) bestScore = sc;
                        break;
                    }
                }
            }

            // --- Khớp 2 số cuối CHÍNH XÁC ---
            if (len >= 2 && rootLen >= 2 &&
                userTail2[0] === adminTail2[0] &&
                userTail2[1] === adminTail2[1]) {
                var sc = 12;
                if (sc > bestScore) bestScore = sc;
            }
        }

        if (matchCount >= 3)      bestScore = Math.min(bestScore + 12, 48);
        else if (matchCount >= 2) bestScore = Math.min(bestScore + 6,  45);

        return {
            score:      Math.min(bestScore, 48),
            matched:    bestScore >= 30,
            matchCount: matchCount
        };
    },

    // ============================================================
    //  SMART NOISE
    // ============================================================
    smartNoise: function(normMatch, len, matchCount) {
        var amplitude;
        if (matchCount >= 1) amplitude = 0.8;
        else if (normMatch > 0.5) amplitude = 1.5;
        else amplitude = 2.5;
        if (len < 4) amplitude *= 1.3;

        return (Math.sin(Date.now() / 1000 + len * 4) * amplitude * 0.5) +
               (Math.random() - 0.5) * amplitude;
    }
};
