// ==========================================
// FIREBASE CONFIGURATION CONFIG & INITIALIZATION
// ==========================================
// Paste your Firebase Credentials inside this block to deploy on Spark Plan free tier
const firebaseConfig = {
  apiKey: "AIzaSyC_Be4ubX04WMKvwbqgzIFr-z0Uy_Kiaw4",
  authDomain: "freskey-c5489.firebaseapp.com",
  projectId: "freskey-c5489",
  storageBucket: "freskey-c5489.firebasestorage.app",
  messagingSenderId: "378578648103",
  appId: "1:378578648103:web:17397cd4d282693ea1a202"
};

// Auto Detection fallback to alert user if credentials were not provided.
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  alert("WARNING: Please insert your customized Firebase config parameter keys within app.js to link up backend database records.");
}

// Initializing the Firebase application compatibility environment.
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set persistent auth across closing tab sessions
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ==========================================
// APP MEMORY STATE
// ==========================================
const state = {
  currentUser: null,
  userName: "Administrator",
  activeView: "dashboard",
  parties: [],
  bills: [],
  payments: [],
  activities: [],
  instances: {
    partyModal: null,
    billModal: null,
    paymentModal: null,
    partyDetailModal: null
  }
};

// ==========================================
// DOCUMENT LEVEL SELECTORS
// ==========================================
const DOM = {
  authScreen: document.getElementById("auth-screen"),
  appContainer: document.getElementById("app-container"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginErrorMsg: document.getElementById("login-error-msg"),
  btnLogout: document.getElementById("btn-logout"),
  navUserName: document.getElementById("nav-user-name"),
  currentPageTitle: document.getElementById("current-page-title"),
  loadingSpinner: document.getElementById("loading-spinner"),
  
  // Dashboard Metrics UI Selectors
  dashTotalParties: document.getElementById("dash-total-parties"),
  dashTotalBills: document.getElementById("dash-total-bills"),
  dashTotalOutstanding: document.getElementById("dash-total-outstanding"),
  dashTotalPayments: document.getElementById("dash-total-payments"),
  dashPendingCount: document.getElementById("dash-pending-count"),
  dashTimelineList: document.getElementById("dash-timeline-list"),
  
  // Tables Selectors
  partiesTbody: document.getElementById("parties-tbody"),
  billsTbody: document.getElementById("bills-tbody"),
  paymentsTbody: document.getElementById("payments-tbody"),
  activitiesTbody: document.getElementById("activities-tbody"),
  
  // Search Selectors
  partySearch: document.getElementById("party-search-input"),
  billSearch: document.getElementById("bill-search-input"),
  paymentSearch: document.getElementById("payment-search-input"),
  
  // Forms & Modal Elements
  partyForm: document.getElementById("party-form"),
  billForm: document.getElementById("bill-form"),
  paymentForm: document.getElementById("payment-form"),
  
  // Bill Dynamic Items Elements
  billItemsTbody: document.getElementById("bill-items-tbody"),
  btnAddItemRow: document.getElementById("btn-add-item-row"),
  billItemsGrandTotal: document.getElementById("bill-items-grand-total"),
  
  // Ledger View Specific Selector
  ledgerPartySelect: document.getElementById("ledger-party-select"),
  btnGenerateLedger: document.getElementById("btn-generate-ledger"),
  btnPrintLedger: document.getElementById("btn-print-ledger"),
  ledgerTbody: document.getElementById("ledger-tbody"),
  ledgerGenDate: document.getElementById("ledger-generation-date"),
  ledgerCompName: document.getElementById("ledger-company-name"),
  ledgerCompInfo: document.getElementById("ledger-company-info")
};

// ==========================================
// TOAST NOTIFICATIONS HELPER
// ==========================================
function showNotification(message, type = "info") {
  const toastEl = document.getElementById("app-toast");
  const toastText = document.getElementById("toast-text-content");
  const toastIcon = document.getElementById("toast-icon");
  
  toastEl.className = `toast align-items-center border-0 shadow-lg text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}`;
  toastIcon.className = `bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'}`;
  toastText.querySelector('span').innerText = message;
  
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
}

function toggleLoader(show) {
  if (show) DOM.loadingSpinner.classList.remove("d-none");
  else DOM.loadingSpinner.classList.add("d-none");
}

// ==========================================
// AUTHENTICATION OBSERVER & ROUTER FLOWS
// ==========================================
auth.onAuthStateChanged((user) => {
  if (user) {
    state.currentUser = user;
    
    // Check and maps system specific Operators (Arpit or Daksh)
    const email = user.email.toLowerCase();
    if (email.includes("arpit")) {
      state.userName = "Arpit";
    } else if (email.includes("daksh")) {
      state.userName = "Daksh";
    } else {
      state.userName = user.displayName || user.email.split("@")[0];
    }
    
    DOM.navUserName.innerText = state.userName;
    DOM.authScreen.classList.add("d-none");
    DOM.appContainer.classList.remove("d-none");
    
    // Fast initialize Bootstrap Modal wrappers.
    state.instances.partyModal = new bootstrap.Modal(document.getElementById("modal-party"));
    state.instances.billModal = new bootstrap.Modal(document.getElementById("modal-bill"));
    state.instances.paymentModal = new bootstrap.Modal(document.getElementById("modal-payment"));
    state.instances.partyDetailModal = new bootstrap.Modal(document.getElementById("modal-party-details"));
    
    // Pull full environment dataset
    bootstrapBackend();
  } else {
    state.currentUser = null;
    DOM.authScreen.classList.remove("d-none");
    DOM.appContainer.classList.add("d-none");
  }
});

DOM.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  toggleLoader(true);
  DOM.loginErrorMsg.classList.add("d-none");
  
  const email = DOM.loginEmail.value.trim();
  const password = DOM.loginPassword.value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      toggleLoader(false);
      DOM.loginForm.reset();
    })
    .catch((error) => {
      toggleLoader(false);
      DOM.loginErrorMsg.innerText = error.message;
      DOM.loginErrorMsg.classList.remove("d-none");
    });
});

DOM.btnLogout.addEventListener("click", () => {
  toggleLoader(true);
  auth.signOut()
    .then(() => {
      toggleLoader(false);
      showNotification("Successfully logged out.", "info");
    })
    .catch(() => toggleLoader(false));
});

// SPA View switching Router
function switchView(targetView) {
  state.activeView = targetView;
  
  // Toggle Views container visibility
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.add("d-none");
  });
  const viewElement = document.getElementById(`view-${targetView}`);
  if (viewElement) {
    viewElement.classList.remove("d-none");
  }
  
  // Manage CSS styles on desktop sidebar elements
  document.querySelectorAll(".sidebar-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === targetView) {
      item.classList.add("active");
    }
  });

  // Manage CSS styles on mobile floating navigation bar
  document.querySelectorAll(".mobile-nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === targetView) {
      item.classList.add("active");
    }
  });

  // Dynamic page title mapping adjustments
  const textMappings = {
    dashboard: "Dashboard",
    parties: "Parties",
    bills: "Bills",
    payments: "Payments",
    ledger: "Ledger",
    activity: "Activity History"
  };
  DOM.currentPageTitle.innerText = textMappings[targetView] || "Freskey";
  
  // Refresh layout components
  renderState(targetView);
}

// Attach Event Listeners to Desktop Sidebar Options
document.querySelectorAll(".sidebar-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const view = item.getAttribute("data-view");
    switchView(view);
  });
});

// Attach Event Listeners to Mobile Floating Navigation Tabs
document.querySelectorAll(".mobile-nav-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const view = item.getAttribute("data-view");
    switchView(view);
  });
});

// ==========================================
// SYSTEM LOG ENGINE (READ-ONLY ACTIVITY HISTORY)
// ==========================================
function recordActivity(action, description) {
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  const activityDoc = {
    userName: state.userName,
    action: action,
    description: description,
    timestamp: timestamp
  };
  
  db.collection("activities").add(activityDoc).catch(e => {
    console.error("Activity logging failed", e);
  });
}

// ==========================================
// CORE FIREBASE DATA INTEGRATOR (SPARK-OPTIMIZED STATIC FETCH)
// ==========================================
function bootstrapBackend() {
  toggleLoader(true);
  
  // Parallel asynchronous calls to optimize resource usage and speed up data load
  Promise.all([
    db.collection("parties").where("isDeleted", "==", false).get(),
    db.collection("bills").where("isDeleted", "==", false).get(),
    db.collection("payments").where("isDeleted", "==", false).get(),
    db.collection("activities").orderBy("timestamp", "desc").limit(100).get()
  ]).then(([partiesSnapshot, billsSnapshot, paymentsSnapshot, activitiesSnapshot]) => {
    
    // Parse snapshot states into state storage
    state.parties = [];
    partiesSnapshot.forEach(doc => {
      state.parties.push({ id: doc.id, ...doc.data() });
    });
    
    state.bills = [];
    billsSnapshot.forEach(doc => {
      state.bills.push({ id: doc.id, ...doc.data() });
    });
    
    state.payments = [];
    paymentsSnapshot.forEach(doc => {
      state.payments.push({ id: doc.id, ...doc.data() });
    });
    
    state.activities = [];
    activitiesSnapshot.forEach(doc => {
      state.activities.push({ id: doc.id, ...doc.data() });
    });
    
    toggleLoader(false);
    renderState(state.activeView);
    populateDropdowns();
  }).catch(error => {
    toggleLoader(false);
    showNotification("Error downloading backend structures: " + error.message, "error");
  });
}

// Utility updater function to refresh local cache storage following updates/deletions.
function updateLocalStateAndSync() {
  // Rather than running resource-heavy queries, build UI computations dynamically in-memory.
  renderState(state.activeView);
  populateDropdowns();
}

function populateDropdowns() {
  const dropdownHTML = ['<option value="">-- Choose Party --</option>'];
  state.parties.forEach(p => {
    dropdownHTML.push(`<option value="${p.id}">${escapeHTML(p.name)}</option>`);
  });
  
  DOM.ledgerPartySelect.innerHTML = dropdownHTML.join("");
  document.getElementById("bill-form-party-id").innerHTML = dropdownHTML.join("");
  document.getElementById("payment-form-party-id").innerHTML = dropdownHTML.join("");
}

// ==========================================
// TEMPLATE ENGINE & DATA RENDERING INTERFACE
// ==========================================
function renderState(view) {
  switch (view) {
    case "dashboard":
      renderDashboardUI();
      break;
    case "parties":
      renderPartiesUI();
      break;
    case "bills":
      renderBillsUI();
      break;
    case "payments":
      renderPaymentsUI();
      break;
    case "ledger":
      // Controlled via specific generation button
      break;
    case "activity":
      renderActivitiesUI();
      break;
  }
}

// --- VIEW WRITER: DASHBOARD ---
function renderDashboardUI() {
  // Aggregate calculations using in-memory state
  const totalParties = state.parties.length;
  
  let totalBilled = 0;
  state.bills.forEach(b => { totalBilled += Number(b.totalAmount || 0); });
  
  let totalPaid = 0;
  state.payments.forEach(p => { totalPaid += Number(p.amount || 0); });
  
  let totalOutstanding = 0;
  state.parties.forEach(p => { totalOutstanding += Number(p.outstandingBalance || 0); });
  
  // Pending Invoices = Active unpaid bills
  const pendingCount = state.bills.filter(b => {
    const p = state.parties.find(x => x.id === b.partyId);
    return p && p.outstandingBalance > 0 && new Date(b.dueDate) < new Date();
  }).length;

  DOM.dashTotalParties.innerText = totalParties;
  DOM.dashTotalBills.innerText = formatCurrency(totalBilled);
  DOM.dashTotalOutstanding.innerText = formatCurrency(totalOutstanding);
  DOM.dashTotalPayments.innerText = formatCurrency(totalPaid);
  DOM.dashPendingCount.innerText = pendingCount;
  
  // Timeline UI rendering (Last 5 actions)
  const timelineHTML = [];
  const recents = state.activities.slice(0, 5);
  if (recents.length === 0) {
    timelineHTML.push(`<li class="text-muted small">No modifications tracked yet.</li>`);
  } else {
    recents.forEach(act => {
      const timeStr = act.timestamp ? formatDate(act.timestamp.toDate()) : "Just now";
      timelineHTML.push(`
        <li class="timeline-item">
          <div class="timeline-marker"></div>
          <p class="mb-0 fw-bold small text-dark">${escapeHTML(act.userName)} ${escapeHTML(act.action)}</p>
          <span class="text-muted small d-block" style="font-size: 0.75rem;">${escapeHTML(act.description)} • ${timeStr}</span>
        </li>
      `);
    });
  }
  DOM.dashTimelineList.innerHTML = timelineHTML.join("");
}

// --- VIEW WRITER: PARTIES ---
function renderPartiesUI(filterText = "") {
  let list = state.parties;
  if (filterText) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
      p.mobile.includes(filterText) ||
      (p.gst && p.gst.toLowerCase().includes(filterText.toLowerCase()))
    );
  }
  
  const html = [];
  if (list.length === 0) {
    html.push(`<tr><td colspan="7" class="text-center text-muted">No party structures match the filters.</td></tr>`);
  } else {
    list.forEach(p => {
      html.push(`
        <tr>
          <td>
            <a href="#" onclick="viewPartyDetails('${p.id}')" class="fw-bold text-decoration-none text-primary">
              ${escapeHTML(p.name)}
            </a>
          </td>
          <td><code>${p.gst ? escapeHTML(p.gst) : '--'}</code></td>
          <td>${escapeHTML(p.mobile)}</td>
          <td class="text-end fw-medium">${formatCurrency(p.totalBills || 0)}</td>
          <td class="text-end fw-medium text-success">${formatCurrency(p.totalPayments || 0)}</td>
          <td class="text-end fw-bold text-danger">${formatCurrency(p.outstandingBalance || 0)}</td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-dark" onclick="editParty('${p.id}')" title="Edit Properties"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-outline-danger" onclick="deleteParty('${p.id}')" title="Soft Delete"><i class="bi bi-trash3"></i></button>
            </div>
          </td>
        </tr>
      `);
    });
  }
  DOM.partiesTbody.innerHTML = html.join("");
}

DOM.partySearch.addEventListener("input", (e) => {
  renderPartiesUI(e.target.value.trim());
});

// --- VIEW WRITER: BILLS ---
function renderBillsUI(filterText = "") {
  let list = state.bills;
  if (filterText) {
    list = list.filter(b => 
      b.billNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      b.partyName.toLowerCase().includes(filterText.toLowerCase())
    );
  }
  
  const html = [];
  if (list.length === 0) {
    html.push(`<tr><td colspan="6" class="text-center text-muted">No billing records found.</td></tr>`);
  } else {
    list.forEach(b => {
      html.push(`
        <tr>
          <td><span class="badge bg-light text-dark border fw-bold">${escapeHTML(b.billNumber)}</span></td>
          <td>${formatDateString(b.billDate)}</td>
          <td>${formatDateString(b.dueDate)}</td>
          <td class="fw-medium">${escapeHTML(b.partyName)}</td>
          <td class="text-end fw-bold text-primary">${formatCurrency(b.totalAmount)}</td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-dark" onclick="editBill('${b.id}')" title="Edit Bill"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" onclick="deleteBill('${b.id}')" title="Delete Bill"><i class="bi bi-trash3"></i></button>
            </div>
          </td>
        </tr>
      `);
    });
  }
  DOM.billsTbody.innerHTML = html.join("");
}

DOM.billSearch.addEventListener("input", (e) => {
  renderBillsUI(e.target.value.trim());
});

// --- VIEW WRITER: PAYMENTS ---
function renderPaymentsUI(filterText = "") {
  let list = state.payments;
  if (filterText) {
    list = list.filter(p => 
      p.partyName.toLowerCase().includes(filterText.toLowerCase()) ||
      p.mode.toLowerCase().includes(filterText.toLowerCase())
    );
  }
  
  const html = [];
  if (list.length === 0) {
    html.push(`<tr><td colspan="5" class="text-center text-muted">No payments match queries.</td></tr>`);
  } else {
    list.forEach(p => {
      html.push(`
        <tr>
          <td>${formatDateString(p.paymentDate)}</td>
          <td class="fw-bold">${escapeHTML(p.partyName)}</td>
          <td><span class="badge bg-secondary">${escapeHTML(p.mode)}</span></td>
          <td class="text-end fw-bold text-success">${formatCurrency(p.amount)}</td>
          <td class="text-center">
            <button class="btn btn-outline-danger btn-sm" onclick="deletePayment('${p.id}')" title="Delete Payment Ledger Log"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>
      `);
    });
  }
  DOM.paymentsTbody.innerHTML = html.join("");
}

DOM.paymentSearch.addEventListener("input", (e) => {
  renderPaymentsUI(e.target.value.trim());
});

// --- VIEW WRITER: SYSTEM ACTIVITIES ---
function renderActivitiesUI() {
  const html = [];
  if (state.activities.length === 0) {
    html.push(`<tr><td colspan="4" class="text-center text-muted">History cache empty.</td></tr>`);
  } else {
    state.activities.forEach(act => {
      const stamp = act.timestamp ? formatDate(act.timestamp.toDate()) : "Processing";
      html.push(`
        <tr>
          <td><small class="text-muted fw-bold">${stamp}</small></td>
          <td><span class="badge bg-light text-dark border">${escapeHTML(act.userName)}</span></td>
          <td><span class="badge bg-dark">${escapeHTML(act.action)}</span></td>
          <td><span class="small">${escapeHTML(act.description)}</span></td>
        </tr>
      `);
    });
  }
  DOM.activitiesTbody.innerHTML = html.join("");
}

// ==========================================
// BUSINESS LOGIC: PARTY TRANSACTIONS CRUD
// ==========================================
function openPartyModal() {
  document.getElementById("party-form-id").value = "";
  DOM.partyForm.reset();
  document.getElementById("modal-party-title").innerText = "Create Vendor Party";
  state.instances.partyModal.show();
}

function editParty(id) {
  const party = state.parties.find(p => p.id === id);
  if (!party) return;
  
  document.getElementById("party-form-id").value = party.id;
  document.getElementById("party-form-name").value = party.name;
  document.getElementById("party-form-mobile").value = party.mobile;
  document.getElementById("party-form-gst").value = party.gst || "";
  document.getElementById("party-form-address").value = party.address || "";
  document.getElementById("party-form-notes").value = party.notes || "";
  
  document.getElementById("modal-party-title").innerText = "Edit Corporate Party: " + party.name;
  state.instances.partyModal.show();
}

DOM.partyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("party-form-id").value;
  const name = document.getElementById("party-form-name").value.trim();
  const mobile = document.getElementById("party-form-mobile").value.trim();
  const gst = document.getElementById("party-form-gst").value.trim();
  const address = document.getElementById("party-form-address").value.trim();
  const notes = document.getElementById("party-form-notes").value.trim();
  
  toggleLoader(true);
  
  const payload = {
    name, mobile, gst, address, notes,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (id) {
    // Update Record inside Firestore
    db.collection("parties").doc(id).update(payload)
      .then(() => {
        toggleLoader(false);
        state.instances.partyModal.hide();
        
        // Audit log action
        recordActivity("Updated Party Details", `Modified properties of party vendor: "${name}"`);
        
        // Update operational memory block
        const index = state.parties.findIndex(p => p.id === id);
        if (index !== -1) state.parties[index] = { ...state.parties[index], ...payload };
        
        showNotification(`Vendor updated: ${name}`, "success");
        updateLocalStateAndSync();
      }).catch(err => {
        toggleLoader(false);
        showNotification(err.message, "error");
      });
  } else {
    // New Record configuration defaults
    payload.totalBills = 0;
    payload.totalPayments = 0;
    payload.outstandingBalance = 0;
    payload.isDeleted = false;
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    
    db.collection("parties").add(payload)
      .then((docRef) => {
        toggleLoader(false);
        state.instances.partyModal.hide();
        
        recordActivity("Created Party", `Registered new vendor entity: "${name}"`);
        
        payload.id = docRef.id;
        state.parties.push(payload);
        
        showNotification(`New Vendor Registered: ${name}`, "success");
        updateLocalStateAndSync();
      }).catch(err => {
        toggleLoader(false);
        showNotification(err.message, "error");
      });
  }
});

function deleteParty(id) {
  const party = state.parties.find(p => p.id === id);
  if (!party) return;
  
  if (confirm(`Are you absolutely sure you want to delete "${party.name}"? Active balances will be hidden.`)) {
    toggleLoader(true);
    db.collection("parties").doc(id).update({ isDeleted: true })
      .then(() => {
        toggleLoader(false);
        recordActivity("Deleted Party", `Soft deleted party vendor: "${party.name}"`);
        
        state.parties = state.parties.filter(p => p.id !== id);
        showNotification(`Vendor "${party.name}" removed securely.`, "info");
        updateLocalStateAndSync();
      }).catch(err => {
        toggleLoader(false);
        showNotification(err.message, "error");
      });
  }
}

// VIEW DETAILED PARTY MODAL OVERVIEW
function viewPartyDetails(partyId) {
  const party = state.parties.find(p => p.id === partyId);
  if (!party) return;
  
  document.getElementById("party-detail-title").innerText = `Detailed Profile: ${party.name}`;
  document.getElementById("party-detail-mobile").innerText = party.mobile || "--";
  document.getElementById("party-detail-gst").innerText = party.gst || "--";
  document.getElementById("party-detail-address").innerText = party.address || "--";
  
  document.getElementById("party-detail-total-bills").innerText = formatCurrency(party.totalBills || 0);
  document.getElementById("party-detail-total-payments").innerText = formatCurrency(party.totalPayments || 0);
  document.getElementById("party-detail-outstanding").innerText = formatCurrency(party.outstandingBalance || 0);
  
  // Filter active transactions
  const activeBills = state.bills.filter(b => b.partyId === partyId);
  const activePayments = state.payments.filter(p => p.partyId === partyId);
  
  const txList = [];
  activeBills.forEach(b => txList.push({ date: b.billDate, type: `Invoice Purchase (#${b.billNumber})`, db: b.totalAmount, cr: 0 }));
  activePayments.forEach(p => txList.push({ date: p.paymentDate, type: `Cash remitted via (${p.mode})`, db: 0, cr: p.amount }));
  
  // Sort date descending
  txList.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  const tbodyHTML = [];
  txList.slice(0, 5).forEach(tx => {
    tbodyHTML.push(`
      <tr>
        <td>${formatDateString(tx.date)}</td>
        <td>${escapeHTML(tx.type)}</td>
        <td class="text-end text-danger">${tx.db > 0 ? formatCurrency(tx.db) : '--'}</td>
        <td class="text-end text-success">${tx.cr > 0 ? formatCurrency(tx.cr) : '--'}</td>
      </tr>
    `);
  });
  
  if (txList.length === 0) {
    tbodyHTML.push(`<tr><td colspan="4" class="text-center text-muted small">No transactions on record for this client.</td></tr>`);
  }
  
  document.getElementById("party-detail-transactions-tbody").innerHTML = tbodyHTML.join("");
  state.instances.partyDetailModal.show();
}

// ==========================================
// BUSINESS LOGIC: BILLS & DYNAMIC ROW CALCULATOR
// ==========================================
function createItemRow(name = "", qty = 1, rate = 0) {
  const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
  const rowHTML = `
    <tr class="item-calc-row" id="${rowId}">
      <td><input type="text" class="form-control form-control-sm item-name-field" value="${escapeHTML(name)}" placeholder="Item Particulars Description" required></td>
      <td><input type="number" min="1" class="form-control form-control-sm item-qty-field" value="${qty}" required></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm item-rate-field" value="${rate}" required></td>
      <td><input type="number" class="form-control form-control-sm item-total-field bg-light border-0 fw-bold" value="${(qty * rate).toFixed(2)}" readonly></td>
      <td class="text-center"><button type="button" class="btn btn-outline-danger btn-sm p-1 lh-1" onclick="removeItemRow('${rowId}')"><i class="bi bi-x-lg"></i></button></td>
    </tr>
  `;
  
  const dNode = document.createElement("tbody");
  dNode.innerHTML = rowHTML;
  DOM.billItemsTbody.appendChild(dNode.firstElementChild);
  attachRowListeners();
}

function removeItemRow(id) {
  const targetRow = document.getElementById(id);
  if (targetRow) {
    targetRow.remove();
    recomputeGrandTotals();
  }
}

function attachRowListeners() {
  document.querySelectorAll(".item-calc-row").forEach(row => {
    const qtyInput = row.querySelector(".item-qty-field");
    const rateInput = row.querySelector(".item-rate-field");
    const totalInput = row.querySelector(".item-total-field");
    
    // Cleanup old events to prevent memory leaks
    qtyInput.oninput = null;
    rateInput.oninput = null;
    
    // Bind real-time recalculations
    const calculate = () => {
      const q = parseFloat(qtyInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      totalInput.value = (q * r).toFixed(2);
      recomputeGrandTotals();
    };
    
    qtyInput.oninput = calculate;
    rateInput.oninput = calculate;
  });
}

function recomputeGrandTotals() {
  let subtotal = 0;
  document.querySelectorAll(".item-total-field").forEach(input => {
    subtotal += parseFloat(input.value) || 0;
  });
  DOM.billItemsGrandTotal.innerText = formatCurrency(subtotal);
}

DOM.btnAddItemRow.addEventListener("click", () => createItemRow("", 1, 0));

function openBillModal() {
  document.getElementById("bill-form-id").value = "";
  DOM.billForm.reset();
  DOM.billItemsTbody.innerHTML = "";
  
  // Set default current system date
  document.getElementById("bill-form-date").value = new Date().toISOString().substring(0, 10);
  document.getElementById("bill-form-due-date").value = new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10);
  
  // Always initialize bill modal creation with 1 base entry line
  createItemRow("", 1, 0);
  document.getElementById("modal-bill-title").innerText = "Create Vendor Purchase Invoice";
  state.instances.billModal.show();
}

function editBill(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  
  document.getElementById("bill-form-id").value = bill.id;
  document.getElementById("bill-form-number").value = bill.billNumber;
  document.getElementById("bill-form-party-id").value = bill.partyId;
  document.getElementById("bill-form-date").value = bill.billDate;
  document.getElementById("bill-form-due-date").value = bill.dueDate;
  
  DOM.billItemsTbody.innerHTML = "";
  if (bill.items && bill.items.length > 0) {
    bill.items.forEach(it => {
      createItemRow(it.name, it.quantity, it.rate);
    });
  } else {
    createItemRow("", 1, 0);
  }
  
  recomputeGrandTotals();
  document.getElementById("modal-bill-title").innerText = `Edit Invoice (#${bill.billNumber})`;
  state.instances.billModal.show();
}

DOM.billForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const id = document.getElementById("bill-form-id").value;
  const billNumber = document.getElementById("bill-form-number").value.trim();
  const partyId = document.getElementById("bill-form-party-id").value;
  const billDate = document.getElementById("bill-form-date").value;
  const dueDate = document.getElementById("bill-form-due-date").value;
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) {
    showNotification("Associated vendor context not valid.", "error");
    return;
  }
  
  // Extract parsed array structures of items
  const items = [];
  let rowValidationError = false;
  
  document.querySelectorAll(".item-calc-row").forEach(row => {
    const name = row.querySelector(".item-name-field").value.trim();
    const quantity = parseFloat(row.querySelector(".item-qty-field").value) || 0;
    const rate = parseFloat(row.querySelector(".item-rate-field").value) || 0;
    
    if (!name) rowValidationError = true;
    items.push({ name, quantity, rate, amount: quantity * rate });
  });
  
  if (rowValidationError) {
    showNotification("Please provide names for all rows.", "error");
    return;
  }
  
  const totalAmount = items.reduce((acc, current) => acc + current.amount, 0);
  
  toggleLoader(true);
  
  const payload = {
    billNumber, partyId, partyName: party.name,
    billDate, dueDate, items, totalAmount,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const dbRef = db.collection("bills");
    
    if (id) {
      // Logic adjustment calculations: Need to extract the net-difference impact to apply accurately
      const oldBill = state.bills.find(b => b.id === id);
      const diffTotal = totalAmount - oldBill.totalAmount;
      
      // Update Firestore invoice
      await dbRef.doc(id).update(payload);
      
      // Update associated party totals
      const updatedBalance = Number(party.outstandingBalance || 0) + diffTotal;
      const updatedBillsSum = Number(party.totalBills || 0) + diffTotal;
      
      await db.collection("parties").doc(partyId).update({
        totalBills: updatedBillsSum,
        outstandingBalance: updatedBalance
      });
      
      // Sync memory storage state
      const partyIdx = state.parties.findIndex(p => p.id === partyId);
      if (partyIdx !== -1) {
        state.parties[partyIdx].totalBills = updatedBillsSum;
        state.parties[partyIdx].outstandingBalance = updatedBalance;
      }
      
      const idx = state.bills.findIndex(b => b.id === id);
      if (idx !== -1) state.bills[idx] = { ...state.bills[idx], ...payload };
      
      recordActivity("Modified Invoice Details", `Updated Bill #${billNumber} for vendor: "${party.name}". Net Change: ${formatCurrency(diffTotal)}`);
      showNotification(`Invoice #${billNumber} updated.`, "success");
      
    } else {
      payload.isDeleted = false;
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      // Create Firestore Invoice
      const doc = await dbRef.add(payload);
      payload.id = doc.id;
      
      // Update aggregate counts of the Vendor
      const updatedBalance = Number(party.outstandingBalance || 0) + totalAmount;
      const updatedBillsSum = Number(party.totalBills || 0) + totalAmount;
      
      await db.collection("parties").doc(partyId).update({
        totalBills: updatedBillsSum,
        outstandingBalance: updatedBalance
      });
      
      // Sync memory state
      const partyIdx = state.parties.findIndex(p => p.id === partyId);
      if (partyIdx !== -1) {
        state.parties[partyIdx].totalBills = updatedBillsSum;
        state.parties[partyIdx].outstandingBalance = updatedBalance;
      }
      
      state.bills.push(payload);
      
      recordActivity("Created Invoice Record", `Created Bill #${billNumber} for vendor "${party.name}". Total Valued: ${formatCurrency(totalAmount)}`);
      showNotification(`Invoice #${billNumber} recorded.`, "success");
    }
    
    state.instances.billModal.hide();
    updateLocalStateAndSync();
    
  } catch (error) {
    showNotification("Transaction error encountered: " + error.message, "error");
  } finally {
    toggleLoader(false);
  }
});

function deleteBill(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  
  if (confirm(`Are you sure you want to delete Invoice #${bill.billNumber}?`)) {
    toggleLoader(true);
    
    db.collection("bills").doc(id).update({ isDeleted: true })
      .then(async () => {
        const party = state.parties.find(p => p.id === bill.partyId);
        if (party) {
          const updatedBalance = Number(party.outstandingBalance || 0) - bill.totalAmount;
          const updatedBillsSum = Number(party.totalBills || 0) - bill.totalAmount;
          
          await db.collection("parties").doc(bill.partyId).update({
            totalBills: updatedBillsSum,
            outstandingBalance: updatedBalance
          });
          
          const partyIdx = state.parties.findIndex(p => p.id === bill.partyId);
          if (partyIdx !== -1) {
            state.parties[partyIdx].totalBills = updatedBillsSum;
            state.parties[partyIdx].outstandingBalance = updatedBalance;
          }
        }
        
        recordActivity("Deleted Invoice Receipt", `Removed Bill #${bill.billNumber} values. Deducted ${formatCurrency(bill.totalAmount)} liability.`);
        state.bills = state.bills.filter(b => b.id !== id);
        showNotification("Invoice deleted.", "info");
        updateLocalStateAndSync();
      })
      .catch(err => {
        showNotification(err.message, "error");
      })
      .finally(() => toggleLoader(false));
  }
}

// ==========================================
// BUSINESS LOGIC: PAYMENT TRANSACTIONS CRUD
// ==========================================
function openPaymentModal() {
  document.getElementById("payment-form-id").value = "";
  DOM.paymentForm.reset();
  document.getElementById("payment-form-date").value = new Date().toISOString().substring(0, 10);
  document.getElementById("modal-payment-title").innerText = "Record Payment";
  state.instances.paymentModal.show();
}

DOM.paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const partyId = document.getElementById("payment-form-party-id").value;
  const paymentDate = document.getElementById("payment-form-date").value;
  const amount = parseFloat(document.getElementById("payment-form-amount").value) || 0;
  const mode = document.getElementById("payment-form-mode").value;
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) {
    showNotification("A valid vendor is required to register payment logs.", "error");
    return;
  }
  
  toggleLoader(true);
  
  const payload = {
    partyId, partyName: party.name,
    paymentDate, amount, mode,
    isDeleted: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const doc = await db.collection("payments").add(payload);
    payload.id = doc.id;
    
    // Update structural balance records on Party Vendor collection
    const updatedBalance = Number(party.outstandingBalance || 0) - amount;
    const updatedPaymentsSum = Number(party.totalPayments || 0) + amount;
    
    await db.collection("parties").doc(partyId).update({
      totalPayments: updatedPaymentsSum,
      outstandingBalance: updatedBalance
    });
    
    const partyIdx = state.parties.findIndex(p => p.id === partyId);
    if (partyIdx !== -1) {
      state.parties[partyIdx].totalPayments = updatedPaymentsSum;
      state.parties[partyIdx].outstandingBalance = updatedBalance;
    }
    
    state.payments.push(payload);
    
    recordActivity("Logged Cash Disbursement", `Logged ${formatCurrency(amount)} payment via ${mode} to party vendor "${party.name}"`);
    showNotification(`Payment of ${formatCurrency(amount)} logged.`, "success");
    state.instances.paymentModal.hide();
    updateLocalStateAndSync();
    
  } catch (err) {
    showNotification(err.message, "error");
  } finally {
    toggleLoader(false);
  }
});

function deletePayment(id) {
  const payment = state.payments.find(p => p.id === id);
  if (!payment) return;
  
  if (confirm(`Reverse this payment entry? Warning: This will increase the vendor's outstanding balance.`)) {
    toggleLoader(true);
    
    db.collection("payments").doc(id).update({ isDeleted: true })
      .then(async () => {
        const party = state.parties.find(p => p.id === payment.partyId);
        if (party) {
          const updatedBalance = Number(party.outstandingBalance || 0) + payment.amount;
          const updatedPaymentsSum = Number(party.totalPayments || 0) - payment.amount;
          
          await db.collection("parties").doc(payment.partyId).update({
            totalPayments: updatedPaymentsSum,
            outstandingBalance: updatedBalance
          });
          
          const partyIdx = state.parties.findIndex(p => p.id === payment.partyId);
          if (partyIdx !== -1) {
            state.parties[partyIdx].totalPayments = updatedPaymentsSum;
            state.parties[partyIdx].outstandingBalance = updatedBalance;
          }
        }
        
        recordActivity("Reversed Remittance Record", `Voided payment transaction of ${formatCurrency(payment.amount)} to vendor "${payment.partyName}"`);
        state.payments = state.payments.filter(p => p.id !== id);
        showNotification("Payment entry reversed.", "info");
        updateLocalStateAndSync();
      })
      .catch(err => {
        showNotification(err.message, "error");
      })
      .finally(() => toggleLoader(false));
  }
}

// ==========================================
// BUSINESS LOGIC: ACCOUNTING ENGINE LEDGER
// ==========================================
DOM.btnGenerateLedger.addEventListener("click", () => {
  const partyId = DOM.ledgerPartySelect.value;
  if (!partyId) {
    showNotification("Select a party vendor.", "info");
    return;
  }
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) return;
  
  // Combine related debits and credits
  const partyBills = state.bills.filter(b => b.partyId === partyId);
  const partyPayments = state.payments.filter(p => p.partyId === partyId);
  
  const journal = [];
  
  partyBills.forEach(b => {
    journal.push({
      date: b.billDate,
      desc: `Purchase Invoice Bill #${b.billNumber}`,
      debit: b.totalAmount,
      credit: 0
    });
  });
  
  partyPayments.forEach(p => {
    journal.push({
      date: p.paymentDate,
      desc: `Payment Disbursed via ${p.mode}`,
      debit: 0,
      credit: p.amount
    });
  });
  
  // Sort journal chronologically
  journal.sort((a,b) => new Date(a.date) - new Date(b.date));
  
  // Generate statement data rows
  let balance = 0;
  const tbodyHTML = [];
  
  journal.forEach(txn => {
    balance += (txn.debit - txn.credit);
    tbodyHTML.push(`
      <tr>
        <td>${formatDateString(txn.date)}</td>
        <td class="fw-medium">${escapeHTML(txn.desc)}</td>
        <td class="text-end text-danger">${txn.debit > 0 ? formatCurrency(txn.debit) : '--'}</td>
        <td class="text-end text-success">${txn.credit > 0 ? formatCurrency(txn.credit) : '--'}</td>
        <td class="text-end fw-bold ${balance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(balance)}</td>
      </tr>
    `);
  });
  
  if (journal.length === 0) {
    tbodyHTML.push(`<tr><td colspan="5" class="text-center text-muted">No journal records matching active criteria.</td></tr>`);
    DOM.btnPrintLedger.disabled = true;
  } else {
    DOM.btnPrintLedger.disabled = false;
  }
  
  // Update Print Layout elements
  DOM.ledgerGenDate.innerText = new Date().toLocaleString();
  DOM.ledgerCompName.innerText = party.name.toUpperCase();
  DOM.ledgerCompInfo.innerText = `Contact Details: ${party.mobile} | GSTIN No: ${party.gst || 'N/A'}`;
  
  DOM.ledgerTbody.innerHTML = tbodyHTML.join("");
  document.getElementById("print-area").classList.remove("d-none");
});

DOM.btnPrintLedger.addEventListener("click", () => {
  window.print();
});

// ==========================================
// FORMATTING & SECURITY ESCAPING UTILITIES
// ==========================================
function formatCurrency(num) {
  return "₹" + parseFloat(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateString(str) {
  if (!str) return "--";
  const dateObj = new Date(str);
  if (isNaN(dateObj)) return str;
  return dateObj.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(date) {
  if (!date) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " " + date.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
