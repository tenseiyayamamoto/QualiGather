// メインJavaScript
console.log("App loaded");

function detectLang() {
  // ブラウザの言語コードを取得（例: "ja", "en", "th", "zh" など）
  const lang = navigator.language ? navigator.language.slice(0, 2) : "en";
  // サポートしている言語リスト
  const supported = ["ja", "en", "zh", "th"];
  // サポート外なら英語
  return supported.includes(lang) ? lang : "en";
}

function loadLang(lang) {
  return fetch(`./js/i18n/${lang}.json`)
    .then((res) => res.json())
    .then((json) => {
      i18n = json;
    });
}

// サーバーからデータを取得する関数（Promise/async対応）
async function fetchTableData(dbType, params) {
  try {
    const response = await $.ajax({
      type: "GET",
      url: "./php/get_QualityData.php",
      data: { ...params, base: dbType },
      dataType: "json",
    });
    // 各行にdbTypeカラムを追加
    return response.map((row) => ({ DBTYPE: dbType, ...row }));
  } catch (e) {
    console.error("データ取得エラー", e);
    return [];
  }
}

function updateSearchRangeLabel() {
  const start = document.getElementById("cond-start-date").value;
  const end = document.getElementById("cond-end-date").value;
  document.getElementById("label-start-date").textContent = start || "-";
  document.getElementById("label-end-date").textContent = end || "-";
}

// 日付変更時にラベル更新
document
  .getElementById("cond-start-date")
  .addEventListener("change", updateSearchRangeLabel);
document
  .getElementById("cond-end-date")
  .addEventListener("change", updateSearchRangeLabel);

async function fetchAllData() {
  const startInput = document.getElementById("cond-start-date");
  const endInput = document.getElementById("cond-end-date");

  if (!startInput.value || !endInput.value) {
    alert("開始日と終了日を両方入力してください。");
    return [];
  }

  // 日付型に変換
  const startDate = new Date(startInput.value);
  const endDate = new Date(endInput.value);

  // 期間チェック（1か月=31日以内）
  const diffDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) {
    alert("終了日は開始日以降を選択してください。");
    return [];
  }
  if (diffDays > 31) {
    alert("検索期間は最大1か月（31日）以内にしてください。");
    return [];
  }

  if (startInput && startInput.value && endInput && endInput.value) {
    sdt = `${startInput.value} 00:00`;
    edt = `${endInput.value} 23:59`;
  }

  const LineCD = document.getElementById("cond-linecd");
  const str_LineCd = LineCD ? LineCD.value : "";
  const ModelNoInput = document.getElementById("cond-modelnum");
  const str_ModelNo = ModelNoInput ? ModelNoInput.value : "";

  // チェックボックスで選択されたbaseのみdbTypesに入れる
  // チェックボックスの値を自動で取得し、全ての値も取得できるようにする
  const allBaseCheckboxes = Array.from(
    document.querySelectorAll('input[name="base[]"]')
  );
  const checkedValues = allBaseCheckboxes
    .filter((el) => el.checked)
    .map((el) => el.value);

  // 拠点のみ抽出
  const dbTypes = checkedValues.filter((v) => v !== "QRA" && v !== "CQI");

  if (dbTypes.length === 0) {
    alert("1つも選択されていません。少なくとも1つ選択してください。");
    return [];
  }
  // 初期表示
  updateSearchRangeLabel();

  // QRA/CQIフラグ抽出
  const isQRA = checkedValues.includes("QRA");
  const isCQI = checkedValues.includes("CQI");
  const promises = dbTypes.map((dbType) =>
    fetchTableData(dbType, {
      start_date: sdt,
      end_date: edt,
      line: str_LineCd,
      model: str_ModelNo,
      qra: isQRA,
      cqi: isCQI,
    })
  );
  // 並列で全てのDBから取得
  const results = await Promise.all(promises);
  // すべてのデータを1つの配列にまとめる
  return results.flat();
}

async function DataSearch() {
  try {
    document.getElementById("loading-screen").style.display = "flex";
    document.getElementById("content").style.display = "none";

    // 非同期でテーブルを初期化
    const tableData = await fetchAllData();

    // 例：DBTYPEを日本語に変換
    const dbTypeMap = {
      oyama: i18n.oyama,
      nakatsu: i18n.nakatsu,
      tnwx: i18n.tnwx,
      tnph: i18n.tnph,
      tnth: i18n.tnth,
      kobe: i18n.kobe,
      tnmi: i18n.tnmi,
    };

    const flwcntrlnumMap = {
      0: i18n.FS_0,
      1: i18n.FS_1,
      2: i18n.FS_2,
      3: i18n.FS_3,
      4: i18n.FS_4,
    };

    const newTableData = tableData.map((row) => ({
      ...row,
      DBTYPE: dbTypeMap[row.DBTYPE] || row.DBTYPE,
      FLWCNTRLNUM: flwcntrlnumMap[row.FLWCNTRLNUM] || row.FLWCNTRLNUM,
    }));

    window.latestTableData = newTableData;

    var tableOptions = {
      data: newTableData,
      paging: false,
      scrollCollapse: true,
      fixedHeader: true,
      searching: true,
      ordering: true,
      paging: true, // ← trueに変更
      pageLength: 200, // 1ページあたりの件数（例：50件）
      select: true,
      scrollX: true,
      deferRender: true,
      scrollY: "60vh",
      dom: "Bfrtip",
      buttons: [
        "colvis",
        {
          extend: "excel",
          text: "Excel",
        },
        {
          extend: "csv",
          text: "CSV",
          bom: true,
        },
        "pdf",
        "copy",
        "print",
      ],
      columns: [
        { title: "Base", data: "DBTYPE", fontweight: "bold" },
        { title: i18n.LINECD, data: "LINECD", width: "80px" },
        { title: i18n.Status, data: "FLWCNTRLNUM", width: "100px" },
        { title: i18n.OCCURRDT, data: "OCCURRDT" },
        { title: i18n.Model_NO, data: "MODELNUM", width: "150px" },
        { title: "PHNMNDTILCD", data: "PHNMNDTILCD", visible: false },
        { title: i18n.Phenomenon, data: "PHNMNDTILNM", width: "150px" },
        { title: "CAUSEDTILCD", data: "CAUSEDTILCD", visible: false },
        { title: i18n.Cause, data: "CAUSEDTILNM", width: "150px" },
        { title: i18n.DISPRO, data: "DISPRO" },
        { title: i18n.OCCPRO, data: "OCCPRO" },
        { title: "QRAFLAG", data: "QRAFLAG", visible: false },
        { title: i18n.P_RMRKS, data: "P_RMRKS", width: "150px" },
        { title: i18n.C_RMRKS, data: "C_RMRKS", width: "150px" },
        { title: "QRNO", data: "QRNO" },
        { title: i18n.ISN, data: "IDNTID" },
        { title: "LINDROPNO", data: "LINDROPNO", visible: false },
        { title: i18n.REENTRYDT, data: "REENTRYDT" },
        { title: i18n.REENTRY_STATION, data: "REENTRY_STATION", width: "50px" },
        { title: i18n.REENTRYRMRKS, data: "REENTRYRMRKS", width: "50px" },
        {
          title: i18n.QRA_FLAG,
          data: "QRA_FLAG",
          render: function (data) {
            return data === "1" ? "●" : "";
          },
          // セルの値を中心にする
          createdCell: function (td, cellData) {
            td.style.textAlign = "center";
            td.style.verticalAlign = "middle";
          },
        },
        {
          title: i18n.SPCL_CHR_FLAG,
          data: "SPCL_CHR_FLAG",
          render: function (data) {
            return data === "1" ? "●" : "";
          },
          // セルの値を中心にする
          createdCell: function (td, cellData) {
            td.style.textAlign = "center";
            td.style.verticalAlign = "middle";
          },
        },
      ],
      createdRow: function (row, data, dataIndex) {
        // 各セルにtitle属性を追加（セル内容をツールチップ表示）
        $("td", row).each(function (i) {
          var cellText = $(this).text();
          $(this).attr("title", cellText);
        });

        // DBTYPEごとに色を指定
        let color = "";
        switch (data.DBTYPE) {
          case i18n.oyama:
            color = "darkblue";
            break;
          case i18n.nakatsu:
            color = "darkorange";

            break;
          case i18n.tnwx:
            color = "purple";
            break;
          case i18n.tnph:
            color = "darkgreen";
            break;
          case i18n.tnth:
            color = "gold";
            break;
          case i18n.tnmi:
            color = "lightseagreen";
            break;
          case i18n.kobe:
            color = "brown";
            break;
          default:
            color = "black";
        }
        // 1列目（Base列）の文字色を変更
        $("td", row).eq(0).css("color", color);
      },
    };
    // DataTableが既に初期化されていれば破棄
    if ($.fn.DataTable.isDataTable("#app")) {
      $("#app").DataTable().clear().destroy();
    }

    // 新しく初期化
    $("#app").DataTable(tableOptions).columns.adjust();
    document.getElementById("loading-screen").style.display = "none";
    document.getElementById("content").style.display = "block";

    // チャートも必ず最新化
    drawChart(); // ← ここを追加

    // //});
  } catch (e) {
    alert("データ取得またはテーブル描画でエラーが発生しました。\n" + e.message);
    console.error(e);

    document.getElementById("loading-screen").style.display = "none";
    document.getElementById("content").style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // デフォルト日付セット（初回のみ）
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  // yyyy-mm-dd形式に変換
  const pad = (n) => n.toString().padStart(2, "0");
  const startVal = `${weekAgo.getFullYear()}-${pad(
    weekAgo.getMonth() + 1
  )}-${pad(weekAgo.getDate())}`;
  const endVal = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;

  document.getElementById("cond-start-date").value = startVal;
  document.getElementById("cond-end-date").value = endVal;

  // 言語ファイルをロードしてからテーブルを初期化
  const lang = detectLang();

  loadLang(lang).then(async () => {
    await DataSearch();

    // 検索フォーム送信時にDataSearchを実行
    document
      .getElementById("condition-form")
      .addEventListener("submit", async function (e) {
        e.preventDefault(); // フォームの通常送信を防ぐ
        await DataSearch(); // データ取得・テーブル更新を待つ
        drawChart(); // その後チャートを更新
      });
  });
});

document.getElementById("show-grid").addEventListener("click", function () {
  document.getElementById("grid-area").style.display = "block";
  document.getElementById("chart-area").style.display = "none";
  document.getElementById("detail-charts").style.display = "none"; // ←追加
  document.getElementById("main-charts").style.display = "block"; // ←追加
  if (
    window.canvas_detailChart &&
    typeof window.canvas_detailChart.destroy === "function"
  ) {
    window.canvas_detailChart.destroy();
  }
});

document.getElementById("show-chart").addEventListener("click", function () {
  document.getElementById("grid-area").style.display = "none";
  document.getElementById("chart-area").style.display = "block";
  document.getElementById("main-charts").style.display = "block"; // ←追加
  document.getElementById("detail-charts").style.display = "none"; // ←追加
  if (
    window.canvas_detailChart &&
    typeof window.canvas_detailChart.destroy === "function"
  ) {
    window.canvas_detailChart.destroy();
  }
  // $("#app").DataTable().destroy();
  // $("#app").empty();
  drawChart(); // チャート描画関数（後述）
});

// 拠点別発生件数チャート表示
let chartState = "main"; // "main", "line", "process"
let currentBase = null;
let currentLine = null;
function drawChart() {
  const tableData = window.latestTableData || [];

  const colorList = [
    "darkblue",
    "red",
    "purple",
    "darkgreen",
    "gold",
    "lightseagreen",
    "brown",
  ];

  const baseOrder = [
    i18n.oyama,
    i18n.nakatsu,
    i18n.tnwx,
    i18n.tnph,
    i18n.tnth,
    i18n.tnmi,
    i18n.kobe,
  ];

  // --- 拠点別合計件数 ---
  const baseCount = {};
  tableData.forEach((row) => {
    baseCount[row.DBTYPE] = (baseCount[row.DBTYPE] || 0) + 1;
  });
  const baseLabels = baseOrder.filter((name) => baseCount[name]);
  const baseValues = baseOrder.map((name) => baseCount[name] || 0);

  const baseCtx = document.getElementById("baseCountChart").getContext("2d");
  if (window.baseChart && typeof window.baseChart.destroy === "function") {
    window.baseChart.destroy();
  }

  window.baseChart = new Chart(baseCtx, {
    type: "bar",
    data: {
      labels: baseLabels,
      datasets: [
        {
          label: "件数",
          data: baseValues,
          backgroundColor: baseLabels.map(
            (name) => colorList[baseOrder.indexOf(name)]
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "end", // バーの上端
          color: "red", // 赤文字
          backgroundColor: "white", // 白背景
          borderColor: "black", // 黒縁
          borderWidth: 2,
          borderRadius: 4,
          font: {
            weight: "bold",
            size: 14,
          },
          padding: 4,
          offset: -4, // バーから少し離す（マイナス値で上方向）
          formatter: function (value, context) {
            return value;
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "拠点" },
          ticks: {
            font: {
              size: 18, // ← 拠点名ラベルのフォントサイズを大きく
              weight: "bold",
            },
            color: "#222", // ラベル色（必要なら変更）
          },
        },
        y: { title: { display: true, text: "件数" }, beginAtZero: true },
      },
      onClick: function (evt, elements) {
        if (elements.length > 0) {
          const idx = elements[0].index;
          const selectedBase = baseLabels[idx];
          showLineChartForBase(selectedBase);
        }
      },
    },
    plugins: [ChartDataLabels],
  });

  // --- 拠点別発生推移（折れ線グラフ） ---
  // 拠点一覧
  const bases = [...new Set(tableData.map((row) => row.DBTYPE))];
  // 日付一覧
  const dateSet = new Set();
  tableData.forEach((row) => {
    const date = row.OCCURRDT ? row.OCCURRDT.slice(0, 10) : "";
    if (date) dateSet.add(date);
  });
  const timelineLabels = Array.from(dateSet).sort();

  // X軸の最大表示数（6日分）
  const maxDays = 6;
  const xMax =
    timelineLabels.length > maxDays ? maxDays - 1 : timelineLabels.length - 1;

  // 拠点ごとに日別件数・累積件数を集計
  const datasets = [];
  bases.forEach((base, idx) => {
    // 日別件数
    const dailyCounts = timelineLabels.map(
      (date) =>
        tableData.filter(
          (row) =>
            row.DBTYPE === base &&
            row.OCCURRDT &&
            row.OCCURRDT.slice(0, 10) === date
        ).length
    );
    // 累積件数
    let cumulative = 0;
    const cumulativeCounts = dailyCounts.map((count) => (cumulative += count));

    // 棒グラフ（その日の発生件数）
    datasets.push({
      type: "bar",
      label: `${base}（日別）`,
      data: dailyCounts,
      backgroundColor: colorList[idx % colorList.length],
      borderColor: colorList[idx % colorList.length],
      borderWidth: 1,
      yAxisID: "y",
    });
    // 折れ線グラフ（累積件数）
    datasets.push({
      type: "line",
      label: `${base}（累積）`, // 空文字にして凡例非表示
      data: cumulativeCounts,
      borderColor: colorList[idx % colorList.length],
      backgroundColor: "rgba(0,0,0,0)",
      fill: false,
      tension: 0.2,
      yAxisID: "y",
      borderDash: [6, 6], // ← 点線
      pointRadius: 6, // ドットの大きさ
      pointBackgroundColor: colorList[idx % colorList.length], // ドットの塗りつぶし色
      datalabels: { display: false },
    });
  });

  const timelineCtx = document.getElementById("timelineChart").getContext("2d");
  if (
    window.timelineChart &&
    typeof window.timelineChart.destroy === "function"
  ) {
    window.timelineChart.destroy();
  }

  const minLabel = timelineLabels[0];
  const maxLabel =
    timelineLabels.length > maxDays
      ? timelineLabels[maxDays - 1]
      : timelineLabels[timelineLabels.length - 1];

  window.timelineChart = new Chart(timelineCtx, {
    type: "bar",
    data: {
      labels: timelineLabels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        zoom: {
          pan: {
            enabled: true,
            mode: "x",
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "日付" },
          min: minLabel,
          max: maxLabel,
          ticks: {
            autoSkip: false,
          },
        },
        y: { title: { display: true, text: "件数" }, beginAtZero: true },
      },
    },
  });
}

// ライン別発生件数チャート表示
function showLineChartForBase(baseName) {
  chartState = "line";
  currentBase = baseName;
  // データ抽出
  const tableData = window.latestTableData || [];
  const filtered = tableData.filter((row) => row.DBTYPE === baseName);

  // ライン一覧
  const lineLabels = [...new Set(filtered.map((row) => row.LINECD))];
  // ラインごとの件数
  const lineCounts = lineLabels.map(
    (line) => filtered.filter((row) => row.LINECD === line).length
  );

  // トータル件数
  const totalCount = lineCounts.reduce((a, b) => a + b, 0);

  // 詳細チャートエリア表示
  document.getElementById("main-charts").style.display = "none";
  document.getElementById("detail-charts").style.display = "block";
  document.getElementById(
    "detail-chart-title"
  ).textContent = `${baseName} のライン別発生件数（合計: ${totalCount}件）`;

  // チャート描画
  const detailCtx = document
    .getElementById("canvas_detailChart")
    .getContext("2d");

  if (
    window.canvas_detailChart &&
    typeof window.canvas_detailChart.destroy === "function"
  ) {
    window.canvas_detailChart.destroy();
  }
  window.canvas_detailChart = new Chart(detailCtx, {
    type: "bar",
    data: {
      labels: lineLabels,
      datasets: [
        {
          label: "件数",
          data: lineCounts,
          backgroundColor: "darkorange",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end", // バーの端
          align: "end", // バーの上端
          color: "red",
          backgroundColor: "white",
          borderColor: "black",
          borderWidth: 2,
          borderRadius: 4,
          font: { weight: "bold", size: 14 },
          padding: 4,
          offset: -4,
          formatter: function (value, context) {
            return value;
          },
        },
        clamp: true,
      },
      scales: {
        x: {
          title: { display: true, text: "ライン" },
          ticks: {
            font: {
              size: 16,
              weight: "bold", // ← 太字
            },
            color: "#222",
          },
        },
        y: { title: { display: true, text: "件数" }, beginAtZero: true },
      },
      onClick: function (evt, elements, chart) {
        if (elements.length > 0) {
          const idx = elements[0].index;
          // チャートのlabelsから選択ラベルを取得
          const selectedLine = chart.data.labels[idx];
          showProcessChart(baseName, selectedLine);
        }
      },
    },
    plugins: [ChartDataLabels],
  });
}

// 工程別発生件数チャート表示
function showProcessChart(baseName, lineName) {
  chartState = "process";
  currentBase = baseName;
  currentLine = lineName;

  // データ抽出
  const tableData = window.latestTableData || [];
  const filtered = tableData.filter(
    (row) => row.DBTYPE === baseName && row.LINECD === lineName
  );

  // 工程一覧
  const processLabels = [
    ...new Set(
      filtered.map((row) =>
        row.DISPRO && row.DISPRO.trim() ? row.DISPRO : "空"
      )
    ),
  ];

  // 工程ごとの件数
  const processCounts = processLabels.map(
    (proc) =>
      filtered.filter(
        (row) => (row.DISPRO && row.DISPRO.trim() ? row.DISPRO : "空") === proc
      ).length
  );

  // トータル件数
  const totalCount = processCounts.reduce((a, b) => a + b, 0);

  // タイトル更新
  document.getElementById(
    "detail-chart-title"
  ).textContent = `${baseName} ${lineName} の工程別発生件数（合計: ${totalCount}件）`;

  // チャート描画
  const detailCtx = document
    .getElementById("canvas_detailChart")
    .getContext("2d");
  if (
    window.canvas_detailChart &&
    typeof window.canvas_detailChart.destroy === "function"
  ) {
    window.canvas_detailChart.destroy();
  }
  window.canvas_detailChart = new Chart(detailCtx, {
    type: "bar",
    data: {
      labels: processLabels,
      datasets: [
        {
          label: "件数",
          data: processCounts,
          backgroundColor: "mediumseagreen",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "end",
          color: "red",
          backgroundColor: "white",
          borderColor: "black",
          borderWidth: 2,
          borderRadius: 4,
          font: { weight: "bold", size: 14 },
          padding: 4,
          offset: -16, // 棒の上に十分離す
          formatter: function (value, context) {
            return value;
          },
          clamp: true,
        },
      },
      scales: {
        x: {
          title: { display: true, text: "工程" },
          ticks: {
            font: {
              size: 16,
              weight: "bold", // ← 太字
            },
            color: "#222",
          },
        },
        y: { title: { display: true, text: "件数" }, beginAtZero: true },
      },
    },
    plugins: [ChartDataLabels],
  });
}

// 戻るボタン
document
  .getElementById("detail-back-btn")
  .addEventListener("click", function () {
    if (chartState === "process") {
      // 工程別→ライン別に戻る
      showLineChartForBase(currentBase);
    } else {
      // ライン別→メインチャートに戻る
      document.getElementById("detail-charts").style.display = "none";
      document.getElementById("main-charts").style.display = "block";
      if (
        window.canvas_detailChart &&
        typeof window.canvas_detailChart.destroy === "function"
      ) {
        window.canvas_detailChart.destroy();
      }
      chartState = "main";
      currentBase = null;
      currentLine = null;
    }
  });
