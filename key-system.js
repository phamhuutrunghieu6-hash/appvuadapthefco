/* Key System V2.2 - PAID ONLY */
var KeySystem = {
    activateKey: function(userId, key, apiUrl, callback) {
        fetch(apiUrl + '?action=activate_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, key: key })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { callback(d.success, d.data, d.error); })
        .catch(function() { callback(false, null, 'Lỗi kết nối'); });
    },

    generateKeys: function(adminId, type, count, apiUrl, callback) {
        fetch(apiUrl + '?action=generate_keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, type: type, count: count })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { callback(d.success, d.data, d.error); })
        .catch(function() { callback(false, null, 'Lỗi kết nối'); });
    },

    getKeys: function(adminId, apiUrl, callback) {
        fetch(apiUrl + '?action=get_keys&admin_id=' + encodeURIComponent(adminId))
            .then(function(r) { return r.json(); })
            .then(function(d) { callback(d.success, d.data, d.error); })
            .catch(function() { callback(false, null, 'Lỗi kết nối'); });
    },

    deleteKey: function(adminId, keyCode, apiUrl, callback) {
        fetch(apiUrl + '?action=delete_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, key: keyCode })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { callback(d.success); })
        .catch(function() { callback(false); });
    },

    extendKey: function(adminId, keyCode, days, apiUrl, callback) {
        fetch(apiUrl + '?action=extend_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: adminId, key: keyCode, days: days })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) { callback(d.success, d.data, d.error); })
        .catch(function() { callback(false, null, 'Lỗi kết nối'); });
    }
};
