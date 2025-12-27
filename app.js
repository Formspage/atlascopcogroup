// =====================================================
// === Supabase Config
// =====================================================
const supabaseUrl = "https://jbmlfwcztaxsjajomkzi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWxmd2N6dGF4c2pham9ta3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTE0MzQsImV4cCI6MjA2NDIyNzQzNH0.RBd9eTa6xe27-HA9FTJYutdk6W9xanCoaqc4t8F_iOA";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// =====================================================
// === Variáveis Globais
// =====================================================
const adminCode = "atlas2025";
let vendorCodes = [];
let userTipo = "";

let isUserEditing = false;
let currentEditingElement = null;
let scrollPosition = 0;

// =====================================================
// === Inicialização
// =====================================================
window.addEventListener("DOMContentLoaded", async () => {
  await carregarVendorCodes();
  await atualizarDatasVazias();
  console.log("Sistema de atualização em tempo real iniciado");
});

// =====================================================
// === Vendors
// =====================================================
async function carregarVendorCodes() {
  try {
    const { data, error } = await supabase
      .from("pedidos")
      .select("vendor")
      .not("vendor", "is", null);

    if (error) {
      console.error("Erro ao carregar vendor codes:", error);
      return;
    }

    const uniqueVendors = [
      ...new Set(
        data
          .map((row) => row.vendor)
          .filter((vendor) => vendor && vendor.trim() !== ""),
      ),
    ];

    vendorCodes = uniqueVendors;
    console.log("Vendor codes carregados:", vendorCodes);
  } catch (error) {
    console.error("Erro ao carregar vendor codes:", error);
  }
}

// =====================================================
// === Atualização de Datas Vazias
// =====================================================
async function atualizarDatasVazias() {
  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ last_promise_delivery_date: "2001-01-01" })
      .or(
        "last_promise_delivery_date.is.null," +
          "last_promise_delivery_date.eq.," +
          'last_promise_delivery_date.eq.""',
      );

    if (error) {
      console.error("Erro ao atualizar datas vazias:", error);
    } else {
      console.log("Datas vazias atualizadas com sucesso");
    }
  } catch (error) {
    console.error("Erro ao atualizar datas vazias:", error);
  }
}

// =====================================================
// === Acesso
// =====================================================
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("codigoAcesso");
  const toggleIcon = document.getElementById("togglePassword");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}

window.togglePasswordVisibility = togglePasswordVisibility;

async function verificarCodigo() {
  const codigo = document.getElementById("codigoAcesso").value.trim();
  const acessoMsg = document.getElementById("acessoMsg");

  if (vendorCodes.length === 0) {
    await carregarVendorCodes();
  }

  if (codigo === adminCode) {
    userTipo = "admin";
    acessoMsg.textContent = "Acesso administrativo concedido";

    document.getElementById("adminButtons").style.display = "block";
    document.getElementById("tabelaSecao").style.display = "block";
    document.querySelector(".home .image").style.display = "none";

    await carregarDados();
    escutarMudancasTempoReal();
  } else if (vendorCodes.includes(codigo)) {
    userTipo = codigo;
    acessoMsg.textContent = `Acesso de vendor concedido (${codigo})`;

    document.getElementById("adminButtons").style.display = "none";
    document.getElementById("tabelaSecao").style.display = "block";
    document.querySelector(".home .image").style.display = "none";

    await carregarDados(codigo);
    escutarMudancasTempoReal();
  } else {
    acessoMsg.textContent = "Código de acesso inválido";
  }
}

// =====================================================
// === Carregamento de Dados
// =====================================================
async function carregarDados(vendorFilter = null) {
  let editingRowId = null;
  let editingValue = null;

  if (currentEditingElement) {
    const row = currentEditingElement.closest("tr");
    if (row) {
      editingRowId = row.getAttribute("data-id");
      editingValue = currentEditingElement.value;
    }
  }

  let query = supabase.from("pedidos").select("*");

  if (userTipo !== "admin" && userTipo !== "") {
    query = query.eq("vendor", userTipo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar dados:", error);
    return;
  }

  const tbody = document.querySelector("#tabelaDados tbody");
  tbody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", row.id);

    const cells = [
      row.purchasing_document || "",
      row.item || "",
      row.material || "",
      row.description || "",
      row.document_date || "",
      row.vendor || "",
      row.vendor_name || "",
      row.order_qty_to_be_delivered || "",
      row.requested_ship_date || "",
    ];

    cells.forEach((cellData) => {
      const td = document.createElement("td");
      td.textContent = cellData;
      tr.appendChild(td);
    });

    const tdDate = document.createElement("td");
    const inputDate = document.createElement("input");

    inputDate.type = "date";

    let dateValue = row.last_promise_delivery_date || "2001-01-01";
    inputDate.value = dateValue;

    inputDate.style.width = "100%";
    inputDate.style.minWidth = "16rem";
    inputDate.style.border = "1px solid #ccc";
    inputDate.style.padding = "0.8rem";
    inputDate.style.fontSize = "1.3rem";

    inputDate.onfocus = () => {
      isUserEditing = true;
      currentEditingElement = inputDate;
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    };

    inputDate.onblur = () => {
      setTimeout(() => {
        isUserEditing = false;
        currentEditingElement = null;
      }, 200);
    };

    inputDate.onchange = () => salvarDataInput(inputDate, row.id);

    tdDate.appendChild(inputDate);
    tdDate.style.backgroundColor = "#e8f5e8";
    tdDate.style.minWidth = "18rem";
    tdDate.style.width = "18rem";

    tr.appendChild(tdDate);
    tbody.appendChild(tr);
  });

  if (editingRowId && editingValue !== null) {
    setTimeout(() => {
      const editingRow = document.querySelector(
        `tr[data-id="${editingRowId}"]`,
      );

      if (editingRow) {
        const dateInput = editingRow.querySelector('input[type="date"]');
        if (dateInput) {
          dateInput.value = editingValue;
          dateInput.focus();
          currentEditingElement = dateInput;
          isUserEditing = true;
          window.scrollTo(0, scrollPosition);
        }
      }
    }, 100);
  }
}

// =====================================================
// === Datas
// =====================================================
function formatarDataBrasileira(dataISO) {
  if (!dataISO || dataISO === "2001-01-01") return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(dataBrasileira) {
  if (!dataBrasileira) return "2001-01-01";
  const [dia, mes, ano] = dataBrasileira.split("/");
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

async function salvarDataInput(input, id) {
  let novaData = input.value || "2001-01-01";
  input.value = novaData;

  try {
    const { error } = await supabase
      .from("pedidos")
      .update({ last_promise_delivery_date: novaData })
      .eq("id", id);

    if (error) {
      console.error("Erro ao salvar data:", error);
      alert("Erro ao salvar a data. Tente novamente.");
    }
  } catch (error) {
    console.error("Erro ao salvar data:", error);
    alert("Erro ao salvar a data. Tente novamente.");
  }
}

window.salvarDataInput = salvarDataInput;

// =====================================================
// === Realtime
// =====================================================
function escutarMudancasTempoReal() {
  supabase
    .channel("realtime_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pedidos" },
      (payload) => {
        console.log("Mudança detectada:", payload);

        if (!isUserEditing) {
          scrollPosition =
            window.pageYOffset || document.documentElement.scrollTop;

          carregarDados().then(() => {
            window.scrollTo(0, scrollPosition);
          });
        }
      },
    )
    .subscribe();
}

// =====================================================
// === Exportação / Importação
// =====================================================
async function exportarExcel() {
  let query = supabase.from("pedidos").select("*");

  if (userTipo !== "admin" && userTipo !== "") {
    query = query.eq("vendor", userTipo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar dados para exportação:", error);
    alert("Erro ao carregar dados para exportação");
    return;
  }

  const worksheetData = [
    [
      "Purchasing Document",
      "Item",
      "Material",
      "Description",
      "Document Date",
      "Vendor",
      "Vendor Name",
      "Order Qty to be Delivered",
      "Requested Ship Date",
      "Last Promise Delivery Date",
    ],
    ...data.map((row) => [
      row.purchasing_document || "",
      row.item || "",
      row.material || "",
      row.description || "",
      formatarDataBrasileira(row.document_date) || "",
      row.vendor || "",
      row.vendor_name || "",
      row.order_qty_to_be_delivered || "",
      formatarDataBrasileira(row.requested_ship_date) || "",
      formatarDataBrasileira(row.last_promise_delivery_date) || "",
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

  const fileName =
    userTipo === "admin"
      ? "AtualizaAbline_Completo.xlsx"
      : `AtualizaAbline_${userTipo}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

window.exportarExcel = exportarExcel;

// =====================================================
// === Voltar ao Menu
// =====================================================
function voltarMenu() {
  document.getElementById("codigoAcesso").value = "";
  document.getElementById("acessoMsg").textContent = "";
  document.getElementById("adminButtons").style.display = "none";
  document.getElementById("tabelaSecao").style.display = "none";
  document.querySelector("#tabelaDados tbody").innerHTML = "";
  document.querySelector(".home .image").style.display = "flex";
}
