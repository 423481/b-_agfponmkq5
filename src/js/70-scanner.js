/* ════════════════════════════════════════════════════════════
   فصل 70 — اسکنر بارکد دوربین
   اسکن زنده با BarcodeDetector و ZXing، تشخیص بارکد، بازگشت به فرم.
   توابع اصلی: closeScanner، applyScan، loadZXing، makeDetector، zxReader، zxFrame، zxDecode، scanGot و …
   ════════════════════════════════════════════════════════════ */

/* ---------- live barcode scanner (camera viewfinder, no photo / gallery) ---------- */
var SCAN = {
  stream: null,
  timer: null,
  target: "",
  last: "",
  hits: 0,
  det: null,
  zr: null,
  cv: null,
  t0: 0,
  tickN: 0,
  detFail: false,
  hinted: false,
};

function closeScanner() {
  clearTimeout(SCAN.timer);
  SCAN.timer = null;
  if (SCAN.stream) {
    SCAN.stream.getTracks().forEach(function (t) {
      try {
        t.stop();
      } catch (e) {}
    });
    SCAN.stream = null;
  }
  var m = document.getElementById("scanmodal");
  if (m && m.parentNode) m.parentNode.removeChild(m);
}

// نتیجه‌ی اسکن را در فیلد مناسب می‌گذارد.
function applyScan(raw, target) {
  var t = engineFromBarcode(digits(raw).replace(/[^A-Za-z0-9]/g, "")),
    msg = "بارکد خوانده شد";
  if (!t) {
    toast("بارکد خوانده نشد. شماره را تایپ کنید.");
    return;
  }
  if (target) {
    var tf = document.getElementById(target);
    if (tf && target === "sm_cars") {
      var cv0 = tf.value.trim();
      tf.value = (cv0 ? cv0.replace(/[,،]\s*$/, "") + "، " : "") + t;
      toast("بارکد خوانده شد");
      return;
    }
    if (tf && target.indexOf("rb-") === 0) {
      tf.value = t.toUpperCase();
      var ff = tf.closest("form");
      if (ff && ff.getAttribute("data-form") === "rowbc")
        saveRowBc(ff.getAttribute("data-id"), tf.value);
      else toast("بارکد خوانده شد");
      return;
    }
    if (tf) {
      tf.value = t.replace(/\D/g, "") || t;
      toast("بارکد خوانده شد");
      return;
    }
  }
  if (/^[A-Za-z0-9]{17}$/.test(t)) {
    t = t.slice(-7);
    msg = "بارکد VIN خوانده شد؛ ۷ رقم آخر به‌عنوان شماره شاسی گذاشته شد";
  }
  ensureCar([t]).then(function () {
    if (S.tab === "short") S.shQ = t;
    else if (S.tab === "car") S.carq = t;
    else S.key = resolveKey(S.sheet, t);
    S.searchErr = "";
    S.formErr = "";
    S.editing = null;
    render();
    toast(msg);
    autoOpen();
  });
}

var ZX_URLS = [
    "zxing.min.js",
    "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js",
    "https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js",
  ],
  zxLoad = null;

function loadZXing() {
  if (window.ZXing) return Promise.resolve(true);
  if (zxLoad) return zxLoad;
  function tryUrl(i) {
    if (i >= ZX_URLS.length) return Promise.resolve(false);
    return new Promise(function (ok) {
      var sc = document.createElement("script");
      sc.src = ZX_URLS[i];
      sc.onload = function () {
        ok(!!window.ZXing);
      };
      sc.onerror = function () {
        ok(false);
      };
      document.head.appendChild(sc);
    }).then(function (ok) {
      return ok ? true : tryUrl(i + 1);
    });
  }
  zxLoad = tryUrl(0).then(function (ok) {
    if (!ok) zxLoad = null;
    return ok;
  });
  return zxLoad;
}

var SCAN_FORMATS = ["code_128", "code_39", "code_93", "ean_13", "ean_8", "itf", "upc_a", "qr_code"];

function makeDetector() {
  if (!window.BarcodeDetector) return Promise.resolve(null);
  var sup = window.BarcodeDetector.getSupportedFormats
    ? window.BarcodeDetector.getSupportedFormats()
    : Promise.resolve(SCAN_FORMATS);
  return sup
    .then(function (list) {
      var f = SCAN_FORMATS.filter(function (x) {
        return list.indexOf(x) >= 0;
      });
      return f.length ? new window.BarcodeDetector({ formats: f }) : null;
    })
    .catch(function () {
      return null;
    });
}

function zxReader() {
  var Z = window.ZXing,
    hints = new Map(),
    F = Z.BarcodeFormat;
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    F.CODE_128,
    F.CODE_39,
    F.CODE_93,
    F.EAN_13,
    F.EAN_8,
    F.ITF,
    F.UPC_A,
    F.QR_CODE,
  ]);
  var r = new Z.MultiFormatReader();
  r.setHints(hints);
  return r;
}

/* فقط نوار وسط تصویر (جای بارکد) و حداکثر ۱۶۰۰ پیکسل پهنا پردازش می‌شود تا سریع و دقیق بماند */
function zxFrame(video) {
  var vw = video.videoWidth,
    vh = video.videoHeight,
    sw = Math.round(vw * 0.9),
    sh = Math.round(vh * 0.7),
    sx = Math.round((vw - sw) / 2),
    sy = Math.round((vh - sh) / 2),
    k = Math.min(1, 1600 / sw);
  var cv = SCAN.cv || (SCAN.cv = document.createElement("canvas"));
  cv.width = Math.round(sw * k);
  cv.height = Math.round(sh * k);
  cv.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return cv;
}

// خواندن بارکد با ZXing وقتی BarcodeDetector کار نکند.
function zxDecode(video) {
  if (!SCAN.zr) SCAN.zr = zxReader();
  var Z = window.ZXing;
  try {
    var bmp = new Z.BinaryBitmap(
      new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(zxFrame(video))),
    );
    return SCAN.zr.decode(bmp).getText();
  } catch (e) {
    return "";
  }
}

function scanGot(raw) {
  raw = String(raw || "").trim();
  if (!raw) return false;
  /* برای خطای صفر: یک مقدار باید دو بار پشت‌سرهم خوانده شود */
  if (raw === SCAN.last) SCAN.hits++;
  else {
    SCAN.last = raw;
    SCAN.hits = 1;
  }
  if (SCAN.hits >= 2) {
    var tg = SCAN.target;
    closeScanner();
    applyScan(raw, tg);
    return true;
  }
  return false;
}

function scanHint() {
  var p = document.querySelector("#scanmodal p");
  if (p)
    p.textContent =
      "خوانده نمی‌شود؛ نور را بیشتر کنید، ۱۵ تا ۲۰ سانتی‌متر فاصله بگیرید و گوشی را ثابت نگه دارید. یا «بستن و تایپ دستی».";
}

// هر چند لحظه یک تصویر از دوربین می‌گیرد و می‌خواند.
function scanTick(video) {
  if (!SCAN.stream) return;
  var age = Date.now() - SCAN.t0;
  function next() {
    SCAN.timer = setTimeout(function () {
      scanTick(video);
    }, 180);
  }
  if (age > 8000 && !SCAN.hinted) {
    SCAN.hinted = true;
    scanHint();
  }
  if (!video.videoWidth) {
    next();
    return;
  }
  /* اسکنر خود کروم اول؛ اگر ۳ ثانیه نخواند یا خطا داد، ZXing هم وارد می‌شود */
  if (age > 3000 || !SCAN.det || SCAN.detFail) loadZXing();
  var useZx = window.ZXing && (!SCAN.det || SCAN.detFail || (age > 3000 && SCAN.tickN % 2 === 1));
  SCAN.tickN++;
  if (useZx) {
    if (!scanGot(zxDecode(video))) next();
    return;
  }
  if (!SCAN.det) {
    next();
    return;
  }
  SCAN.det
    .detect(video)
    .then(function (r) {
      if (!(r && r.length && scanGot(r[0].rawValue))) next();
    })
    .catch(function () {
      SCAN.detFail = true;
      next();
    });
}

function focusTrack(stream) {
  var tr = stream.getVideoTracks()[0],
    cap = tr && tr.getCapabilities ? tr.getCapabilities() : null;
  if (cap && cap.focusMode && cap.focusMode.indexOf("continuous") >= 0)
    tr.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(function () {});
}

// دوربین اسکنر بارکد را باز می‌کند.
function openScanner(target) {
  closeScanner();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    toast("دوربین در این مرورگر در دسترس نیست. شماره را تایپ کنید.");
    return;
  }
  SCAN.target = target || "";
  SCAN.last = "";
  SCAN.hits = 0;
  SCAN.det = null;
  SCAN.zr = null;
  SCAN.t0 = Date.now();
  SCAN.tickN = 0;
  SCAN.detFail = false;
  SCAN.hinted = false;
  var m = document.createElement("div");
  m.id = "scanmodal";
  m.setAttribute("role", "dialog");
  m.setAttribute("aria-label", "اسکن بارکد");
  m.innerHTML =
    '<video id="scanvid" playsinline muted autoplay></video><div class="sc-frame"></div><p>بارکد را داخل کادر زرد نگه دارید</p><button type="button" class="btn" id="scanclose">بستن و تایپ دستی</button>';
  document.body.appendChild(m);
  document.getElementById("scanclose").onclick = closeScanner;
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    })
    .then(function (stream) {
      if (!document.getElementById("scanmodal")) {
        stream.getTracks().forEach(function (t) {
          t.stop();
        });
        return;
      }
      SCAN.stream = stream;
      var v = document.getElementById("scanvid");
      v.srcObject = stream;
      var pl = v.play();
      if (pl && pl.catch) pl.catch(function () {});
      focusTrack(stream);
      makeDetector().then(function (d) {
        SCAN.det = d;
        scanTick(v);
      });
    })
    .catch(function () {
      closeScanner();
      toast("اجازه‌ی دوربین داده نشد یا دوربین باز نشد. شماره را تایپ کنید.");
    });
}
