
// =====================================================
// === Supabase Config
// =====================================================

const supabaseUrl = 'https://jbmlfwcztaxsjajomkzi.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWxmd2N6dGF4c2pham9ta3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTE0MzQsImV4cCI6MjA2NDIyNzQzNH0.RBd9eTa6xe27-HA9FTJYutdk6W9xanCoaqc4t8F_iOA';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);


// =====================================================
// === Variáveis Globais
// =====================================================
const adminCode = 'atlas2025';
let vendorCodes = [];
let userTipo = '';

let isUserEditing = false;
let currentEditingElement = null;
let scrollPosition = 0;

// =====================================================
// === Inicialização
// =====================================================
window.addEventListener('DOMContentLoaded', async () => {
  await carregarVendorCodes();
  // Normaliza apenas NULLs (não sobrescreve strings/valores válidos)
  await atualizarDatasVazias();
  console.log('Sistema de atualização em tempo real iniciado');
});

// =====================================================
// === Vendors
// =====================================================
async function carregarVendorCodes() {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('vendor')
      .not('vendor', 'is', null);

    if (error) {
      console.error('Erro ao carregar vendor codes:', error);
      return;
    }

    const uniqueVendors = [
      ...new Set(
        data
          .map(row => row.vendor)
          .filter(vendor => vendor && vendor.toString().trim() !== '')
      ),
    ];

    vendorCodes = uniqueVendors;
    console.log('Vendor codes carregados:', vendorCodes);
  } catch (error) {
    console.error('Erro ao carregar vendor codes:', error);
  }
}

// =====================================================
// === Atualização de Datas Vazias
// =====================================================
// Atualiza apenas registros onde last_promise_delivery_date IS NULL
async function atualizarDatasVazias() {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ last_promise_delivery_date: '2001-01-01' })
      .is('last_promise_delivery_date', null)
      .select('id');

    if (error) {
      console.error('Erro ao atualizar datas vazias:', error);
    } else {
      if (data && data.length > 0) {
        console.log(`Datas vazias atualizadas (${data.length} registros).`);
      } else {
        console.log('Nenhuma data nula encontrada para atualizar.');
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar datas vazias:', error);
  }
}

// =====================================================
// === Acesso
// =====================================================
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('codigoAcesso');
  const toggleIcon = document.getElementById('togglePassword');
  if (!passwordInput || !toggleIcon) return;

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

async function verificarCodigo() {
  const codigo = document.getElementById('codigoAcesso').value.trim();
  const acessoMsg = document.getElementById('acessoMsg');

  if (vendorCodes.length === 0) {
    await carregarVendorCodes();
  }

  if (codigo === adminCode) {
    userTipo = 'admin';
    acessoMsg.textContent = 'Acesso administrativo concedido';

    document.getElementById('adminButtons').style.display = 'block';
    document.getElementById('tabelaSecao').style.display = 'block';
    const img = document.querySelector('.home .image');
    if (img) img.style.display = 'none';

    await carregarDados();
    escutarMudancasTempoReal();
  } else if (vendorCodes.includes(codigo)) {
    userTipo = codigo;
    acessoMsg.textContent = `Acesso de vendor concedido (${codigo})`;

    document.getElementById('adminButtons').style.display = 'none';
    document.getElementById('tabelaSecao').style.display = 'block';
    const img = document.querySelector('.home .image');
    if (img) img.style.display = 'none';

    await carregarDados(codigo);
    escutarMudancasTempoReal();
  } else {
    acessoMsg.textContent = 'Código de acesso inválido';
  }
}
window.verificarCodigo = verificarCodigo;

// =====================================================
// === Carregamento de Dados
// =====================================================
async function carregarDados(vendorFilter = null) {
  let editingRowId = null;
  let editingValue = null;

  if (currentEditingElement) {
    const row = currentEditingElement.closest('tr');
    if (row) {
      editingRowId = row.getAttribute('data-id');
      editingValue = currentEditingElement.value;
    }
  }

  let query = supabase.from('pedidos').select('*');

  if (userTipo !== 'admin' && userTipo !== '') {
    query = query.eq('vendor', userTipo);
  } else if (vendorFilter) {
    query = query.eq('vendor', vendorFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao carregar dados:', error);
    return;
  }

  const tbody = document.querySelector('#tabelaDados tbody');
  if (!tbody) {
    console.error('#tabelaDados tbody não encontrado.');
    return;
  }
  tbody.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', row.id);

    const cells = [
      row.purchasing_document || '',
      row.item || '',
      row.material || '',
      row.description || '',
      // document_date: remover hora se existir
      row.document_date ? (typeof row.document_date === 'string' && row.document_date.includes('T') ? row.document_date.split('T')[0] : row.document_date) : '',
      row.vendor || '',
      row.vendor_name || '',
      row.order_qty_to_be_delivered || '',
      row.requested_ship_date ? (typeof row.requested_ship_date === 'string' && row.requested_ship_date.includes('T') ? row.requested_ship_date.split('T')[0] : row.requested_ship_date) : '',
    ];

    cells.forEach(cellData => {
      const td = document.createElement('td');
      td.textContent = cellData;
      tr.appendChild(td);
    });

    const tdDate = document.createElement('td');
    const inputDate = document.createElement('input');

    inputDate.type = 'date';

    // Normaliza valor vindo do banco (YYYY-MM-DD) ou vazio
    let dateValue = '';
    if (row.last_promise_delivery_date) {
      if (typeof row.last_promise_delivery_date === 'string' && row.last_promise_delivery_date.includes('T')) {
        dateValue = row.last_promise_delivery_date.split('T')[0];
      } else {
        dateValue = row.last_promise_delivery_date;
      }
    } else {
      dateValue = ''; // mostra vazio quando não houver data
    }
    inputDate.value = dateValue; // ISO YYYY-MM-DD or ''

    inputDate.style.width = '100%';
    inputDate.style.minWidth = '16rem';
    inputDate.style.border = '1px solid #ccc';
    inputDate.style.padding = '0.8rem';
    inputDate.style.fontSize = '1.3rem';

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
    tdDate.style.backgroundColor = '#e8f5e8';
    tdDate.style.minWidth = '18rem';
    tdDate.style.width = '18rem';

    tr.appendChild(tdDate);
    tbody.appendChild(tr);
  });

  if (editingRowId && editingValue !== null) {
    setTimeout(() => {
      const editingRow = document.querySelector(
        `tr[data-id="${editingRowId}"]`
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
// === Datas (formatação apenas para exibição em export)
// =====================================================
function formatarDataBrasileira(dataISO) {
  if (!dataISO) return '';
  const d = (typeof dataISO === 'string' && dataISO.includes('T')) ? dataISO.split('T')[0] : dataISO;
  const [ano, mes, dia] = d.split('-');
  if (!dia || !mes || !ano) return '';
  return `${dia}/${mes}/${ano}`;
}

function formatarDataISO(dataBrasileira) {
  if (!dataBrasileira) return null;
  if (typeof dataBrasileira === 'string' && dataBrasileira.includes('-')) return dataBrasileira;
  const [dia, mes, ano] = dataBrasileira.split('/');
  if (!dia || !mes || !ano) return null;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

// =====================================================
// === Salvar data no Supabase (corrigido)
// =====================================================
async function salvarDataInput(input, id) {
  // input.value já vem como YYYY-MM-DD (ou "" se vazio)
  const novaData = input.value ? input.value : null; // null para limpar no banco

  try {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ last_promise_delivery_date: novaData })
      .eq('id', id)
      .select('last_promise_delivery_date');

    if (error) {
      console.error('Erro ao salvar data:', error);
      alert('Erro ao salvar a data. Verifique permissões/RLS.');
      return;
    }

    if (data && data.length > 0) {
      const saved = data[0].last_promise_delivery_date;
      input.value = saved ? (typeof saved === 'string' && saved.includes('T') ? saved.split('T')[0] : saved) : '';
      console.log(`Data salva (id=${id}):`, input.value);
    } else {
      // nenhum retorno: alerta leve
      console.warn('Update retornou sem dados (id=', id, ')');
    }
  } catch (error) {
    console.error('Erro inesperado ao salvar data:', error);
    alert('Erro inesperado ao salvar a data.');
  }
}
window.salvarDataInput = salvarDataInput;

// =====================================================
// === Realtime
// =====================================================
function escutarMudancasTempoReal() {
  supabase
    .channel('realtime_changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'pedidos' },
      payload => {
        // Atualiza somente a célula que mudou
        const updated = payload.new;
        if (!updated || typeof updated.id === 'undefined') return;

        const row = document.querySelector(`tr[data-id="${updated.id}"]`);
        if (row && !isUserEditing) {
          const inputDate = row.querySelector('input[type="date"]');
          if (inputDate) {
            inputDate.value = updated.last_promise_delivery_date
              ? (typeof updated.last_promise_delivery_date === 'string' && updated.last_promise_delivery_date.includes('T') ? updated.last_promise_delivery_date.split('T')[0] : updated.last_promise_delivery_date)
              : '';
          }
        }
      }
    )
    .subscribe();
}

// =====================================================
// === Exportação / Importação
// =====================================================
async function exportarExcel() {
  let query = supabase.from('pedidos').select('*');

  if (userTipo !== 'admin' && userTipo !== '') {
    query = query.eq('vendor', userTipo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao carregar dados para exportação:', error);
    alert('Erro ao carregar dados para exportação');
    return;
  }

  const worksheetData = [
    [
      'Purchasing Document',
      'Item',
      'Material',
      'Description',
      'Document Date',
      'Vendor',
      'Vendor Name',
      'Order Qty to be Delivered',
      'Requested Ship Date',
      'Last Promise Delivery Date',
    ],
    ...data.map(row => [
      row.purchasing_document || '',
      row.item || '',
      row.material || '',
      row.description || '',
      formatarDataBrasileira(row.document_date) || '',
      row.vendor || '',
      row.vendor_name || '',
      row.order_qty_to_be_delivered || '',
      formatarDataBrasileira(row.requested_ship_date) || '',
      formatarDataBrasileira(row.last_promise_delivery_date) || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

  const fileName =
    userTipo === 'admin'
      ? 'AtualizaAbline_Completo.xlsx'
      : `AtualizaAbline_${userTipo}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
window.exportarExcel = exportarExcel;

function importarExcel() {
  const fileInput = document.getElementById('escolherArquivo') || document.getElementById('adminInputFile');
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    // Limpar dados existentes antes de importar novos
    await supabase.from('pedidos').delete().neq('id', 0);

    for (const row of json) {
      await supabase.from('pedidos').insert({
        purchasing_document: row['Purchasing Document'],
        item: row['Item'],
        material: row['Material'],
        description: row['Description'],
        document_date: formatDate(row['Document Date']),
        vendor: row['Vendor'],
        vendor_name: row['Vendor Name'],
        order_qty_to_be_delivered: row['Order Qty To Be Delivered'],
        requested_ship_date: formatDate(row['Requested Ship Date']),
        last_promise_delivery_date: formatDate(row['Last Promise Delivery Date']) || null,
      });
    }
    await carregarVendorCodes();
    await carregarDados();
    alert('Importação concluída com sucesso!');
  };
  reader.readAsArrayBuffer(file);
}
window.importarExcel = importarExcel;

// Função para formatar datas do Excel (retorna YYYY-MM-DD)
function formatDate(value) {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (isNaN(date)) return '';
    return date.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return '';
  }
  return '';
}

// =====================================================
// === Voltar ao Menu
// =====================================================
function voltarMenu() {
  document.getElementById('codigoAcesso').value = '';
  document.getElementById('acessoMsg').textContent = '';
  document.getElementById('adminButtons').style.display = 'none';
  document.getElementById('tabelaSecao').style.display = 'none';
  document.querySelector('#tabelaDados tbody').innerHTML = '';
  const img = document.querySelector('.home .image');
  if (img) img.style.display = 'flex';
}
window.voltarMenu = voltarMenu;
