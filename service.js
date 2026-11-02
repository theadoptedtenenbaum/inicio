// Servicio del módulo. Corre dentro del servicio Node de TizenBrew, que sí
// recibe el objeto `tizen`; la página no lo tiene, así que pide todo aquí.
// ES5 a propósito: TizenBrew contempla Node antiguo en algunas TVs.
'use strict';

var http = require('http');
var url = require('url');

var VERSION = '2.0.0';
var HOST = '127.0.0.1';
var PORT = 8090;

var errors = [];

function errText(e) {
  if (!e) return 'error desconocido';
  return (e.name || 'Error') + ': ' + (e.message || String(e));
}

function logError(where, e) {
  errors.push({ time: new Date().toISOString(), where: where, error: errText(e) });
  if (errors.length > 20) errors.shift();
}

function hasTizenApp() {
  return typeof tizen !== 'undefined' && !!tizen && !!tizen.application;
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function handleStatus(res) {
  var platform = null;
  try {
    platform = tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version');
  } catch (e) {
    platform = errText(e);
  }
  var info = {};
  try { info.model = tizen.systeminfo.getCapability('http://tizen.org/system/model_name'); } catch (e) {}
  try { info.resolution = tizen.systeminfo.getCapability('http://tizen.org/feature/screen.size.all'); } catch (e) {}
  try { info.network = tizen.systeminfo.getCapability('http://tizen.org/network/type'); } catch (e) {}
  send(res, 200, {
    version: VERSION,
    tizen: typeof tizen,
    tizenApplication: hasTizenApp(),
    platform: platform,
    model: info.model || null,
    resolution: info.resolution || null,
    network: info.network || null,
    node: process.version,
    errors: errors
  });
}

// Lista de apps instaladas: la página la usa para resolver los IDs sola,
// así no hay identificadores escritos a mano que se queden obsoletos.
function handleApps(res) {
  if (!hasTizenApp()) return send(res, 500, { error: 'tizen.application no disponible' });
  try {
    tizen.application.getAppsInfo(function (infos) {
      send(res, 200, infos.map(function (i) {
        return { id: i.id, name: i.name, show: i.show };
      }));
    }, function (e) {
      logError('getAppsInfo', e);
      send(res, 500, { error: 'getAppsInfo falló: ' + errText(e) });
    });
  } catch (e) {
    logError('getAppsInfo', e);
    send(res, 500, { error: errText(e) });
  }
}

// Intenta launch() y, si falla, launchAppControl(): en 2018 a veces sólo
// funciona uno de los dos caminos según la app.
function handleLaunch(res, id) {
  if (!id) return send(res, 400, { error: 'falta el parámetro id' });
  if (!hasTizenApp()) return send(res, 500, { error: 'tizen.application no disponible' });

  var attempts = [];

  function tryAppControl() {
    try {
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view');
      tizen.application.launchAppControl(control, id, function () {
        attempts.push({ method: 'launchAppControl', ok: true });
        send(res, 200, { id: id, ok: true, attempts: attempts });
      }, function (e) {
        logError('launchAppControl ' + id, e);
        attempts.push({ method: 'launchAppControl', ok: false, error: errText(e) });
        send(res, 200, { id: id, ok: false, attempts: attempts });
      });
    } catch (e) {
      logError('launchAppControl ' + id, e);
      attempts.push({ method: 'launchAppControl', ok: false, error: errText(e) });
      send(res, 200, { id: id, ok: false, attempts: attempts });
    }
  }

  try {
    tizen.application.launch(id, function () {
      attempts.push({ method: 'launch', ok: true });
      send(res, 200, { id: id, ok: true, attempts: attempts });
    }, function (e) {
      logError('launch ' + id, e);
      attempts.push({ method: 'launch', ok: false, error: errText(e) });
      tryAppControl();
    });
  } catch (e) {
    logError('launch ' + id, e);
    attempts.push({ method: 'launch', ok: false, error: errText(e) });
    tryAppControl();
  }
}

var server = http.createServer(function (req, res) {
  var parsed = url.parse(req.url, true);
  try {
    switch (parsed.pathname) {
      case '/status': return handleStatus(res);
      case '/apps': return handleApps(res);
      case '/launch': return handleLaunch(res, parsed.query.id);
      default: return send(res, 404, { error: 'ruta desconocida: ' + parsed.pathname });
    }
  } catch (e) {
    logError(parsed.pathname, e);
    send(res, 500, { error: errText(e) });
  }
});

// Puerto ocupado = una instancia anterior sigue viva; no hace falta otra.
server.on('error', function (e) { logError('listen', e); });
server.listen(PORT, HOST);
