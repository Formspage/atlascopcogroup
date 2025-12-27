// === Supabase Config ===
const supabaseUrl = 'https://jbmlfwcztaxsjajomkzi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWxmd2N6dGF4c2pham9ta3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTE0MzQsImV4cCI6MjA2NDIyNzQzNH0.RBd9eTa6xe27-HA9FTJYutdk6W9xanCoaqc4t8F_iOA';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);


const adminCode = 'atlas2025';
let vendorCodes = [];
let userTipo = '';

// Carregar vendors dinamicamente da tabela
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

    // Extrair valores únicos da coluna vendor
    const uniqueVendors = [...new Set(data.map(row => row.vendor).filter(vendor => vendor && vendor.trim() !== ''))];
    vendorCodes = uniqueVendors;
    console.log('Vendor codes carregados:', vendorCodes);
  } catch (error) {
    console.error('Erro ao carregar vendor codes:', error);
  }
}

// Carregar vendor codes quando a página carrega
window.addEventListener('DOMContentLoaded', async () => {
  await carregarVendorCodes();
  await atualizarDatasVazias();
  console.log('Sistema de atualização em tempo real iniciado');
});

// Função para atualizar registros que não possuem data com a data padrão
async function atualizarDatasVazias() {
  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ last_promise_delivery_date: '2001-01-01' })
      .or('last_promise_delivery_date.is.null,last_promise_delivery_date.eq.,last_promise_delivery_date.eq.""');

    if (error) {
      console.error('Erro ao atualizar datas vazias:', error);
    } else {
      console.log('Datas vazias atualizadas com sucesso');
    }
  } catch (error) {
    console.error('Erro ao atualizar datas vazias:', error);
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('codigoAcesso');
  const toggleIcon = document.getElementById('togglePassword');
  
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

  // Garantir que os vendor codes estão carregados
  if (vendorCodes.length === 0) {
    await carregarVendorCodes();
  }

  if (codigo === adminCode) {
    userTipo = 'admin';
    acessoMsg.textContent = 'Acesso administrativo concedido';
    document.getElementById('adminButtons').style.display = 'block';
    document.getElementById('tabelaSecao').style.display = 'block';
    // Ocultar imagem quando tabela for mostrada
    document.querySelector('.home .image').style.display = 'none';
    await carregarDados();
    escutarMudancasTempoReal();
  } else if (vendorCodes.includes(codigo)) {
    userTipo = codigo;
    acessoMsg.textContent = `Acesso de vendor concedido (${codigo})`;
    document.getElementById('adminButtons').style.display = 'none';
    document.getElementById('tabelaSecao').style.display = 'block';
    // Ocultar imagem quando tabela for mostrada
    document.querySelector('.home .image').style.display = 'none';
    await carregarDados(codigo);
    escutarMudancasTempoReal();
  } else {
    acessoMsg.textContent = 'Código de acesso inválido';
  }
}

async function carregarDados(vendorFilter = null) {
  // Salvar informações do elemento em edição
  let editingRowId = null;
  let editingValue = null;
  
  if (currentEditingElement) {
    const row = currentEditingElement.closest('tr');
    if (row) {
      editingRowId = row.getAttribute('data-id');
      editingValue = currentEditingElement.value;
    }
  }
  
  // Filtrar dados baseado no tipo de usuário
  let query = supabase.from('pedidos').select('*');
  
  // Se não for admin, filtrar apenas pelos dados do vendor específico
  if (userTipo !== 'admin' && userTipo !== '') {
    query = query.eq('vendor', userTipo);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Erro ao carregar dados:', error);
    return;
  }

  const tbody = document.querySelector('#tabelaDados tbody');
  tbody.innerHTML = '';
  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', row.id);
    
    // Criar células para as primeiras 9 colunas
    const cells = [
      row.purchasing_document || '',
      row.item || '',
      row.material || '',
      row.description || '',
      row.document_date || '',
      row.vendor || '',
      row.vendor_name || '',
      row.order_qty_to_be_delivered || '', // Esta coluna agora será exibida corretamente
      row.requested_ship_date || ''
    ];
    
    cells.forEach(cellData => {
      const td = document.createElement('td');
      td.textContent = cellData;
      tr.appendChild(td);
    });
    
    // Criar célula especial para Last Promise Delivery Date
    const tdDate = document.createElement('td');
    // Permitir edição tanto para admin quanto para vendor
    const inputDate = document.createElement('input');
    inputDate.type = 'date';
    // Se não há data, usar data padrão 01/01/2001
    const defaultDate = '2001-01-01';
    let dateValue = row.last_promise_delivery_date;
    
    // Se não há data ou está vazia/null, usar data padrão
    if (!dateValue || dateValue === '' || dateValue === null) {
      dateValue = defaultDate;
    }
    
    inputDate.value = dateValue;
    inputDate.style.width = '100%';
    inputDate.style.minWidth = '16rem';
    inputDate.style.border = '1px solid #ccc';
    inputDate.style.padding = '0.8rem';
    inputDate.style.fontSize = '1.3rem';
    
    // Controlar estado de edição
    inputDate.onfocus = () => { 
      isUserEditing = true; 
      currentEditingElement = inputDate;
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    };
    inputDate.onblur = () => { 
      isUserEditing = false; 
      currentEditingElement = null;
      setTimeout(() => {
        isUserEditing = false;
        currentEditingElement = null;
      }, 200); // Delay maior para garantir
    };
    inputDate.onchange = () => salvarDataInput(inputDate, row.id);
    
    tdDate.appendChild(inputDate);
    tdDate.style.backgroundColor = '#e8f5e8';
    tdDate.style.minWidth = '18rem';
    tdDate.style.width = '18rem';
    tr.appendChild(tdDate);
    
    tbody.appendChild(tr);
  });
  
  // Restaurar foco e valor se estava editando
  if (editingRowId && editingValue !== null) {
    setTimeout(() => {
      const editingRow = document.querySelector(`tr[data-id="${editingRowId}"]`);
      if (editingRow) {
        const dateInput = editingRow.querySelector('input[type="date"]');
        if (dateInput) {
          dateInput.value = editingValue;
          dateInput.focus();
          currentEditingElement = dateInput;
          isUserEditing = true;
          
          // Restaurar posição de scroll
          window.scrollTo(0, scrollPosition);
        }
      }
    }, 100);
  }
}

async function salvarData(td) {
  const novaData = td.textContent.trim();
  const tr = td.closest('tr');
  const id = tr.getAttribute('data-id');

  if (!id) {
    console.warn('ID da linha não encontrado.');
    return;
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ last_promise_delivery_date: novaData })
    .eq('id', id);

  if (error) {
    console.error('Erro ao salvar data:', error);
  }
}

// Função para converter data do formato YYYY-MM-DD para DD/MM/YYYY
function formatarDataBrasileira(dataISO) {
  if (!dataISO || dataISO === '2001-01-01') return '';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Função para converter data do formato DD/MM/YYYY para YYYY-MM-DD
function formatarDataISO(dataBrasileira) {
  if (!dataBrasileira) return '2001-01-01';
  const [dia, mes, ano] = dataBrasileira.split('/');
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
}

async function salvarDataInput(input, id) {
  let novaData = input.value;
  
  // Se a data está vazia, usar data padrão
  if (!novaData || novaData === '') {
    novaData = '2001-01-01';
    input.value = novaData;
  }

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ last_promise_delivery_date: novaData })
      .eq('id', id);

    if (error) {
      console.error('Erro ao salvar data:', error);
      alert('Erro ao salvar a data. Tente novamente.');
    } else {
      console.log('Data salva com sucesso no formato brasileiro:', formatarDataBrasileira(novaData));
      // Não recarregar automaticamente para não interromper a edição
    }
  } catch (error) {
    console.error('Erro ao salvar data:', error);
    alert('Erro ao salvar a data. Tente novamente.');
  }
}

window.salvarData = salvarData;
window.salvarDataInput = salvarDataInput;

let isUserEditing = false;
let currentEditingElement = null;
let scrollPosition = 0;

function escutarMudancasTempoReal() {
  supabase.channel('realtime_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pedidos' },
      payload => {
        console.log('Mudança detectada:', payload);
        // Só recarregar se o usuário não estiver editando
        if (!isUserEditing) {
          // Salvar posição de scroll antes de recarregar
          scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
          carregarDados().then(() => {
            // Restaurar posição de scroll após recarregar
            window.scrollTo(0, scrollPosition);
          });
        }
      }
    )
    .subscribe();
}

async function exportarExcel() {
  // Primeiro, carregar os dados mais recentes do banco
  let query = supabase.from('pedidos').select('*');
  
  // Se não for admin, filtrar apenas pelos dados do vendor específico
  if (userTipo !== 'admin' && userTipo !== '') {
    query = query.eq('vendor', userTipo);
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Erro ao carregar dados para exportação:', error);
    alert('Erro ao carregar dados para exportação');
    return;
  }

  // Criar planilha com os dados atualizados
  const worksheetData = [
    // Cabeçalhos
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
      'Last Promise Delivery Date'
    ],
    // Dados
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
      formatarDataBrasileira(row.last_promise_delivery_date) || ''
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  
  const fileName = userTipo === 'admin' ? 'AtualizaAbline_Completo.xlsx' : `AtualizaAbline_${userTipo}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function importarExcel() {
  const fileInput = document.getElementById('escolherArquivo') || document.getElementById('adminInputFile');
  const file = fileInput.files[0];
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
        last_promise_delivery_date: formatDate(row['Last Promise Delivery Date']) || '9999-01-01',
      });
    }
    carregarDados();
    // Recarregar vendor codes após importação
    await carregarVendorCodes();
    alert('Importação concluída com sucesso!');
  };
  reader.readAsArrayBuffer(file);
}

// Função para formatar datas do Excel
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
    return value;
  }
  return '';
}

function voltarMenu() {
  document.getElementById('codigoAcesso').value = '';
  document.getElementById('acessoMsg').textContent = '';
  document.getElementById('adminButtons').style.display = 'none';
  document.getElementById('tabelaSecao').style.display = 'none';
  document.querySelector('#tabelaDados tbody').innerHTML = '';
  // Mostrar imagem novamente ao voltar
  document.querySelector('.home .image').style.display = 'flex';
}
window.exportarExcel = exportarExcel;
