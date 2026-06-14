// ==========================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC_Be4ubX04WMKvwbqgzIFr-z0Uy_Kiaw4",
  authDomain: "freskey-c5489.firebaseapp.com",
  projectId: "freskey-c5489",
  storageBucket: "freskey-c5489.firebasestorage.app",
  messagingSenderId: "378578648103",
  appId: "1:378578648103:web:17397cd4d282693ea1a202"
};

// Check if we are running in Offline Sandbox Mode (no valid keys found)
const isSandboxMode = (firebaseConfig.apiKey === "YOUR_API_KEY" || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_"));

let db = null;
let auth = null;

if (!isSandboxMode) {
  try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  } catch (e) {
    console.error("Firebase config loaded unsuccessfully. Reverting to Mock Sandbox Mode.", e);
  }
} else {
  // Show localized offline alert
  document.getElementById("sandbox-banner").classList.remove("d-none");
}

// ==========================================
// APPLICATION MEMORY STORAGE LAYERS
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
// DYNAMIC DOM RETRIEVER (RESOLVES INTERNAL innerText REFERENCE MISMATCHES) [1]
// ==========================================
const getDOM = () => ({
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
  
  // Dashboard Nodes - Vendors
  dashTotalVendors: document.getElementById("dash-total-vendors"),
  dashTotalPurchases: document.getElementById("dash-total-purchases"),
  dashTotalPaidVendors: document.getElementById("dash-total-paid-vendors"),
  dashTotalPayable: document.getElementById("dash-total-payable"),
  
  // Dashboard Nodes - Customers
  dashTotalCustomers: document.getElementById("dash-total-customers"),
  dashTotalSales: document.getElementById("dash-total-sales"),
  dashTotalReceivedCustomers: document.getElementById("dash-total-received-customers"),
  dashTotalReceivable: document.getElementById("dash-total-receivable"),
  
  dashPendingCount: document.getElementById("dash-pending-count"),
  dashTimelineList: document.getElementById("dash-timeline-list"),
  
  // View Table Bodies
  partiesTbody: document.getElementById("parties-tbody"),
  billsTbody: document.getElementById("bills-tbody"),
  paymentsTbody: document.getElementById("payments-tbody"),
  activitiesTbody: document.getElementById("activities-tbody"),
  
  // Dynamic Searches
  partySearch: document.getElementById("party-search-input"),
  billSearch: document.getElementById("bill-search-input"),
  paymentSearch: document.getElementById("payment-search-input"),
  
  // Dynamic item rows inputs inside Bill Modal
  billItemsTbody: document.getElementById("bill-items-tbody"),
  btnAddItemRow: document.getElementById("btn-add-item-row"),
  billItemsGrandTotal: document.getElementById("bill-items-grand-total"),
  
  // Account statement selections
  ledgerPartySelect: document.getElementById("ledger-party-select"),
  btnGenerateLedger: document.getElementById("btn-generate-ledger"),
  btnPrintLedger: document.getElementById("btn-print-ledger"),
  btnDownloadLedger: document.getElementById("btn-download-ledger"),
  ledgerTbody: document.getElementById("ledger-tbody"),
  ledgerGenDate: document.getElementById("ledger-generation-date"),
  ledgerCompName: document.getElementById("ledger-company-name"),
  ledgerCompInfo: document.getElementById("ledger-company-info"),
  
  // Direct form nodes
  partyForm: document.getElementById("party-form"),
  billForm: document.getElementById("bill-form"),
  paymentForm: document.getElementById("payment-form")
});

// ==========================================
// OFFLINE DATABASE STORAGE LAYER WRAPPER
// ==========================================
const LocalStorageEngine = {
  get: (key) => JSON.parse(localStorage.getItem(`freskey_${key}`)) || [],
  save: (key, val) => localStorage.setItem(`freskey_${key}`, JSON.stringify(val))
};

// ==========================================
// SYSTEM ALERTS & FEEDBACK
// ==========================================
function showNotification(message, type = "info") {
  const toastEl = document.getElementById("app-toast");
  const toastText = document.getElementById("toast-text-content");
  const toastIcon = document.getElementById("toast-icon");
  
  if (toastEl && toastText && toastIcon) {
    toastEl.className = `toast align-items-center border-0 shadow-lg text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}`;
    toastIcon.className = `bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : type === 'success' ? 'bi-check-circle-fill' : 'bi-info-circle-fill'}`;
    toastText.querySelector('span').innerText = message;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
  }
}

function toggleLoader(show) {
  const DOMNode = getDOM();
  if (DOMNode.loadingSpinner) {
    if (show) DOMNode.loadingSpinner.classList.remove("d-none");
    else DOMNode.loadingSpinner.classList.add("d-none");
  }
}

// ==========================================
// BOOTSTRAP MODALS LAZY GETTER (ELIMINATES BUTTON REFERENCE FAILURE) [1]
// ==========================================
function getModalInstance(modalId) {
  if (!state.instances[modalId]) {
    const el = document.getElementById(modalId);
    if (el) {
      state.instances[modalId] = new bootstrap.Modal(el);
    }
  }
  return state.instances[modalId];
}

// ==========================================
// SECURE BOOTSTRAPPING ENGINE (LOAD)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const DOMNode = getDOM();

  // Bind forms
  DOMNode.partyForm.addEventListener("submit", handlePartySubmit);
  DOMNode.billForm.addEventListener("submit", handleBillSubmit);
  DOMNode.paymentForm.addEventListener("submit", handlePaymentSubmit);
  DOMNode.btnAddItemRow.addEventListener("click", () => createItemRow("", 1, 0));
  DOMNode.btnGenerateLedger.addEventListener("click", generateLedgerAudit);
  DOMNode.btnPrintLedger.addEventListener("click", () => window.print());
  DOMNode.btnDownloadLedger.addEventListener("click", downloadLedgerCSV);

  // Bind dynamic real-time searches
  DOMNode.partySearch.addEventListener("input", (e) => renderPartiesUI(e.target.value.trim()));
  DOMNode.billSearch.addEventListener("input", (e) => renderBillsUI(e.target.value.trim()));
  DOMNode.paymentSearch.addEventListener("input", (e) => renderPaymentsUI(e.target.value.trim()));

  // Bind Auth state configurations
  if (!isSandboxMode && auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        state.currentUser = user;
        const email = user.email.toLowerCase();
        state.userName = email.includes("arpit") ? "Arpit" : (email.includes("daksh") ? "Daksh" : user.email.split("@")[0]);
        DOMNode.navUserName.innerText = state.userName;
        
        DOMNode.authScreen.classList.add("d-none");
        DOMNode.appContainer.classList.remove("d-none");
        
        bootstrapBackend();
      } else {
        handleSignOutCleanup();
      }
    });
  } else {
    // If running in local Offline mode, mock user and launch directly
    state.currentUser = { email: "local.sandbox@freskey.com" };
    state.userName = "Local Administrator";
    DOMNode.navUserName.innerText = state.userName;
    DOMNode.authScreen.classList.add("d-none");
    DOMNode.appContainer.classList.remove("d-none");
    
    bootstrapLocalData();
  }
});

function handleSignOutCleanup() {
  state.currentUser = null;
  const DOMNode = getDOM();
  DOMNode.authScreen.classList.remove("d-none");
  DOMNode.appContainer.classList.add("d-none");
}

// Handler to capture user login submissions
document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  toggleLoader(true);
  const DOMNode = getDOM();
  DOMNode.loginErrorMsg.classList.add("d-none");
  
  const email = DOMNode.loginEmail.value.trim();
  const password = DOMNode.loginPassword.value;
  
  if (isSandboxMode) {
    state.currentUser = { email: email };
    state.userName = email.toLowerCase().includes("arpit") ? "Arpit" : (email.toLowerCase().includes("daksh") ? "Daksh" : "Offline Admin");
    DOMNode.navUserName.innerText = state.userName;
    toggleLoader(false);
    
    DOMNode.authScreen.classList.add("d-none");
    DOMNode.appContainer.classList.remove("d-none");
    
    bootstrapLocalData();
    showNotification("Logged in to Local Sandbox.", "success");
    recordActivity("Logged In", "Offline session started on this browser.");
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        toggleLoader(false);
        DOMNode.loginForm.reset();
      })
      .catch((error) => {
        toggleLoader(false);
        DOMNode.loginErrorMsg.innerText = error.message;
        DOMNode.loginErrorMsg.classList.remove("d-none");
      });
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  toggleLoader(true);
  if (isSandboxMode) {
    toggleLoader(false);
    handleSignOutCleanup();
  } else {
    auth.signOut()
      .then(() => {
        toggleLoader(false);
      })
      .catch(() => toggleLoader(false));
  }
});

// ==========================================
// DATA INTEGRATION OPERATIONS
// ==========================================
function bootstrapBackend() {
  toggleLoader(true);
  Promise.all([
    db.collection("parties").where("isDeleted", "==", false).get(),
    db.collection("bills").where("isDeleted", "==", false).get(),
    db.collection("payments").where("isDeleted", "==", false).get(),
    db.collection("activities").orderBy("timestamp", "desc").limit(50).get()
  ]).then(([partiesSn, billsSn, paymentsSn, activitiesSn]) => {
    state.parties = partiesSn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.bills = billsSn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.payments = paymentsSn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    state.activities = activitiesSn.docs.map(doc => {
      const d = doc.data();
      return { id: doc.id, ...d, localStamp: d.timestamp ? d.timestamp.toDate() : new Date() };
    });
    
    toggleLoader(false);
    syncGlobalState();
  }).catch(error => {
    toggleLoader(false);
    showNotification("Error downloading backend data: " + error.message, "error");
  });
}

function bootstrapLocalData() {
  state.parties = LocalStorageEngine.get("parties").filter(p => !p.isDeleted);
  state.bills = LocalStorageEngine.get("bills").filter(b => !b.isDeleted);
  state.payments = LocalStorageEngine.get("payments").filter(p => !p.isDeleted);
  state.activities = LocalStorageEngine.get("activities");
  
  state.activities = state.activities.map(act => ({
    ...act,
    localStamp: act.timestamp ? new Date(act.timestamp) : new Date()
  }));
  
  syncGlobalState();
}

function syncGlobalState() {
  renderState(state.activeView);
  populateDropdowns();
}

function populateDropdowns() {
  const DOMNode = getDOM();
  const dropdownHTML = ['<option value="">-- Choose Party Profile --</option>'];
  state.parties.forEach(p => {
    const typeLabel = p.type === 'Customer' ? 'Customer' : 'Vendor';
    dropdownHTML.push(`<option value="${p.id}">${escapeHTML(p.name)} (${typeLabel})</option>`);
  });
  DOMNode.ledgerPartySelect.innerHTML = dropdownHTML.join("");
  document.getElementById("bill-form-party-id").innerHTML = dropdownHTML.join("");
  document.getElementById("payment-form-party-id").innerHTML = dropdownHTML.join("");
}

// ==========================================
// SYSTEM ACTIVITIES ENGINE
// ==========================================
function recordActivity(action, description) {
  const activityDoc = {
    userName: state.userName,
    action: action,
    description: description,
    timestamp: isSandboxMode ? new Date().toISOString() : firebase.firestore.FieldValue.serverTimestamp()
  };
  
  if (isSandboxMode) {
    const list = LocalStorageEngine.get("activities");
    list.unshift(activityDoc);
    LocalStorageEngine.save("activities", list.slice(0, 100));
    
    activityDoc.localStamp = new Date();
    state.activities.unshift(activityDoc);
    renderDashboardUI();
  } else {
    db.collection("activities").add(activityDoc).catch(e => {
      console.error("Activity logging failed", e);
    });
  }
}

// ==========================================
// ROUTER & VIEW RENDERING
// ==========================================
function switchView(targetView) {
  state.activeView = targetView;
  
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.add("d-none");
  });
  
  const viewElement = document.getElementById(`view-${targetView}`);
  if (viewElement) {
    viewElement.classList.remove("d-none");
  }
  
  document.querySelectorAll(".sidebar-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === targetView) {
      item.classList.add("active");
    }
  });

  document.querySelectorAll(".mobile-nav-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-view") === targetView) {
      item.classList.add("active");
    }
  });

  const textMappings = {
    dashboard: "Dashboard",
    parties: "Vendor & Customer Directory",
    bills: "Invoices / Purchase Bills",
    payments: "Ledger Payments Cashflow",
    ledger: "Account Ledger Statements",
    activity: "Operational History Logs"
  };
  
  const DOMNode = getDOM();
  DOMNode.currentPageTitle.innerText = textMappings[targetView] || "Freskey";
  
  renderState(targetView);
}

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
    case "activity":
      renderActivitiesUI();
      break;
  }
}

// ==========================================
// VIEW WRITERS (UI RENDERING)
// ==========================================
function renderDashboardUI() {
  const DOMNode = getDOM();
  
  let vendorsCount = 0;
  let customersCount = 0;
  
  let totalPurchases = 0; // Vendor bills
  let totalSales = 0;     // Customer bills
  
  let totalPaidVendors = 0;       // Payments we made
  let totalReceivedCustomers = 0; // Payments they made

  state.parties.forEach(p => {
    if (p.type === 'Customer') {
      customersCount++;
      totalSales += Number(p.totalBills || 0);
      totalReceivedCustomers += Number(p.totalPayments || 0);
    } else {
      vendorsCount++;
      totalPurchases += Number(p.totalBills || 0);
      totalPaidVendors += Number(p.totalPayments || 0);
    }
  });

  const outstandingPayable = totalPurchases - totalPaidVendors; // Amount we owe Vendors
  const outstandingReceivable = totalSales - totalReceivedCustomers; // Amount Customers owe us

  // Count pending overdue bills
  const now = new Date();
  const pendingCount = state.bills.filter(b => {
    const isOverdue = new Date(b.dueDate) < now;
    return isOverdue;
  }).length;

  // Render Vendor Panel Stats [1]
  if (DOMNode.dashTotalVendors) DOMNode.dashTotalVendors.innerText = vendorsCount;
  if (DOMNode.dashTotalPurchases) DOMNode.dashTotalPurchases.innerText = formatCurrency(totalPurchases);
  if (DOMNode.dashTotalPaidVendors) DOMNode.dashTotalPaidVendors.innerText = formatCurrency(totalPaidVendors);
  if (DOMNode.dashTotalPayable) DOMNode.dashTotalPayable.innerText = formatCurrency(outstandingPayable);

  // Render Customer Panel Stats [1]
  if (DOMNode.dashTotalCustomers) DOMNode.dashTotalCustomers.innerText = customersCount;
  if (DOMNode.dashTotalSales) DOMNode.dashTotalSales.innerText = formatCurrency(totalSales);
  if (DOMNode.dashTotalReceivedCustomers) DOMNode.dashTotalReceivedCustomers.innerText = formatCurrency(totalReceivedCustomers);
  if (DOMNode.dashTotalReceivable) DOMNode.dashTotalReceivable.innerText = formatCurrency(outstandingReceivable);

  if (DOMNode.dashPendingCount) DOMNode.dashPendingCount.innerText = pendingCount;
  
  const timelineHTML = [];
  const recents = state.activities.slice(0, 5);
  if (recents.length === 0) {
    timelineHTML.push(`<li class="text-muted small">No modifications tracked yet.</li>`);
  } else {
    recents.forEach(act => {
      const timeStr = act.localStamp ? formatDate(act.localStamp) : "Just now";
      timelineHTML.push(`
        <li class="timeline-item">
          <div class="timeline-marker"></div>
          <p class="mb-0 fw-bold small text-dark">${escapeHTML(act.userName)} ${escapeHTML(act.action)}</p>
          <span class="text-muted small d-block" style="font-size: 0.75rem;">${escapeHTML(act.description)} • ${timeStr}</span>
        </li>
      `);
    });
  }
  if (DOMNode.dashTimelineList) DOMNode.dashTimelineList.innerHTML = timelineHTML.join("");
}

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
    html.push(`<tr><td colspan="8" class="text-center text-muted">No matches in directory search.</td></tr>`);
  } else {
    list.forEach(p => {
      const outstandingVal = (p.totalBills || 0) - (p.totalPayments || 0);
      const isCustomer = p.type === 'Customer';
      
      const typeBadge = isCustomer 
        ? `<span class="badge text-dark" style="background-color: var(--freskey-color-3);">Customer</span>`
        : `<span class="badge text-white" style="background-color: var(--freskey-color-5);">Vendor</span>`;
      
      const balanceClass = outstandingVal > 0 
        ? (isCustomer ? 'text-primary' : 'text-danger') 
        : 'text-success';

      html.push(`
        <tr>
          <td>
            <a href="#" onclick="viewPartyDetails('${p.id}'); return false;" class="fw-bold text-decoration-none" style="color: var(--freskey-color-2);">
              ${escapeHTML(p.name)}
            </a>
          </td>
          <td>${typeBadge}</td>
          <td><code>${p.gst ? escapeHTML(p.gst) : '--'}</code></td>
          <td>${escapeHTML(p.mobile)}</td>
          <td class="text-end fw-medium">${formatCurrency(p.totalBills || 0)}</td>
          <td class="text-end fw-medium text-success">${formatCurrency(p.totalPayments || 0)}</td>
          <td class="text-end fw-bold ${balanceClass}">${formatCurrency(outstandingVal)}</td>
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
  const DOMNode = getDOM();
  if (DOMNode.partiesTbody) DOMNode.partiesTbody.innerHTML = html.join("");
}

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
    html.push(`<tr><td colspan="7" class="text-center text-muted">No purchase/sale records logged.</td></tr>`);
  } else {
    list.forEach(b => {
      const pType = b.partyType || 'Vendor';
      const typeBadge = pType === 'Customer'
        ? `<span class="badge text-dark" style="background-color: var(--freskey-color-3); font-size:0.75rem;">Sales</span>`
        : `<span class="badge text-white" style="background-color: var(--freskey-color-5); font-size:0.75rem;">Purchase</span>`;

      html.push(`
        <tr>
          <td><span class="badge bg-light text-dark border fw-bold">${escapeHTML(b.billNumber)}</span></td>
          <td>${formatDateString(b.billDate)}</td>
          <td>${formatDateString(b.dueDate)}</td>
          <td class="fw-medium">${escapeHTML(b.partyName)}</td>
          <td>${typeBadge}</td>
          <td class="text-end fw-bold" style="color: var(--freskey-color-3);">${formatCurrency(b.totalAmount)}</td>
          <td class="text-center">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-dark" onclick="editBill('${b.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" onclick="deleteBill('${b.id}')" title="Delete"><i class="bi bi-trash3"></i></button>
            </div>
          </td>
        </tr>
      `);
    });
  }
  const DOMNode = getDOM();
  if (DOMNode.billsTbody) DOMNode.billsTbody.innerHTML = html.join("");
}

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
    html.push(`<tr><td colspan="6" class="text-center text-muted">No cashflow transactions registered.</td></tr>`);
  } else {
    list.forEach(p => {
      const pType = p.partyType || 'Vendor';
      const typeBadge = pType === 'Customer'
        ? `<span class="badge bg-success-subtle text-success border border-success" style="font-size:0.75rem;">Received</span>`
        : `<span class="badge bg-danger-subtle text-danger border border-danger" style="font-size:0.75rem;">Paid Out</span>`;

      html.push(`
        <tr>
          <td>${formatDateString(p.paymentDate)}</td>
          <td class="fw-bold">${escapeHTML(p.partyName)}</td>
          <td>${typeBadge}</td>
          <td><span class="badge bg-secondary">${escapeHTML(p.mode)}</span></td>
          <td class="text-end fw-bold text-success">${formatCurrency(p.amount)}</td>
          <td class="text-center">
            <button class="btn btn-outline-danger btn-sm" onclick="deletePayment('${p.id}')" title="Delete Ledger Entry"><i class="bi bi-trash3"></i></button>
          </td>
        </tr>
      `);
    });
  }
  const DOMNode = getDOM();
  if (DOMNode.paymentsTbody) DOMNode.paymentsTbody.innerHTML = html.join("");
}

function renderActivitiesUI() {
  const html = [];
  if (state.activities.length === 0) {
    html.push(`<tr><td colspan="4" class="text-center text-muted">Event log history empty.</td></tr>`);
  } else {
    state.activities.forEach(act => {
      const stamp = act.localStamp ? formatDate(act.localStamp) : "Processing";
      html.push(`
        <tr>
          <td><small class="text-muted fw-bold">${stamp}</small></td>
          <td><span class="badge bg-light text-dark border">${escapeHTML(act.userName)}</span></td>
          <td><span class="badge" style="background-color: var(--freskey-color-2); color: #ffffff;">${escapeHTML(act.action)}</span></td>
          <td><span class="small">${escapeHTML(act.description)}</span></td>
        </tr>
      `);
    });
  }
  const DOMNode = getDOM();
  if (DOMNode.activitiesTbody) DOMNode.activitiesTbody.innerHTML = html.join("");
}

// ==========================================
// CRUD OPERATIONS: VENDOR/CUSTOMER PROFILE SUBMISSIONS
// ==========================================
function openPartyModal() {
  const elId = "party-form-id";
  const el = document.getElementById(elId);
  if (el) el.value = "";
  
  const DOMNode = getDOM();
  if (DOMNode.partyForm) DOMNode.partyForm.reset();
  
  const titleEl = document.getElementById("modal-party-title");
  if (titleEl) titleEl.innerText = "Create Vendor / Customer Profile";
  
  const modal = getModalInstance("modal-party");
  if (modal) modal.show();
}

function editParty(id) {
  const party = state.parties.find(p => p.id === id);
  if (!party) return;
  
  document.getElementById("party-form-id").value = party.id;
  document.getElementById("party-form-type").value = party.type || "Customer";
  document.getElementById("party-form-name").value = party.name;
  document.getElementById("party-form-mobile").value = party.mobile;
  document.getElementById("party-form-gst").value = party.gst || "";
  document.getElementById("party-form-address").value = party.address || "";
  document.getElementById("party-form-notes").value = party.notes || "";
  
  document.getElementById("modal-party-title").innerText = "Edit Profile: " + party.name;
  const modal = getModalInstance("modal-party");
  if (modal) modal.show();
}

function handlePartySubmit(e) {
  e.preventDefault();
  const id = document.getElementById("party-form-id").value;
  const type = document.getElementById("party-form-type").value;
  const name = document.getElementById("party-form-name").value.trim();
  const mobile = document.getElementById("party-form-mobile").value.trim();
  const gst = document.getElementById("party-form-gst").value.trim();
  const address = document.getElementById("party-form-address").value.trim();
  const notes = document.getElementById("party-form-notes").value.trim();
  
  toggleLoader(true);
  
  const payload = {
    type, name, mobile, gst, address, notes,
    updatedAt: new Date().toISOString()
  };
  
  if (isSandboxMode) {
    const list = LocalStorageEngine.get("parties");
    if (id) {
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...payload };
        state.parties[idx] = list[idx];
      }
      recordActivity("Updated Profile", `Modified properties of ${type}: "${name}"`);
      showNotification(`Profile updated: ${name}`, "success");
    } else {
      payload.id = 'p_' + Math.random().toString(36).substr(2, 9);
      payload.totalBills = 0;
      payload.totalPayments = 0;
      payload.isDeleted = false;
      payload.createdAt = new Date().toISOString();
      
      list.push(payload);
      state.parties.push(payload);
      recordActivity("Created Profile", `Registered new ${type}: "${name}"`);
      showNotification(`Profile registered: ${name}`, "success");
    }
    
    LocalStorageEngine.save("parties", list);
    toggleLoader(false);
    const modal = getModalInstance("modal-party");
    if (modal) modal.hide();
    syncGlobalState();
  } else {
    const dbRef = db.collection("parties");
    if (id) {
      dbRef.doc(id).update({
        ...payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        const idx = state.parties.findIndex(p => p.id === id);
        if (idx !== -1) state.parties[idx] = { ...state.parties[idx], ...payload };
        recordActivity("Updated Profile", `Modified properties of ${type}: "${name}"`);
        showNotification(`Profile updated: ${name}`, "success");
        const modal = getModalInstance("modal-party");
        if (modal) modal.hide();
        syncGlobalState();
      }).catch(err => showNotification(err.message, "error"))
        .finally(() => toggleLoader(false));
    } else {
      const completePayload = {
        ...payload,
        totalBills: 0,
        totalPayments: 0,
        isDeleted: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      dbRef.add(completePayload).then(docRef => {
        completePayload.id = docRef.id;
        state.parties.push(completePayload);
        recordActivity("Created Profile", `Registered new ${type}: "${name}"`);
        showNotification(`Profile registered: ${name}`, "success");
        const modal = getModalInstance("modal-party");
        if (modal) modal.hide();
        syncGlobalState();
      }).catch(err => showNotification(err.message, "error"))
        .finally(() => toggleLoader(false));
    }
  }
}

function deleteParty(id) {
  const party = state.parties.find(p => p.id === id);
  if (!party) return;
  
  if (confirm(`Delete the profile "${party.name}"? Historical records will be archived.`)) {
    toggleLoader(true);
    if (isSandboxMode) {
      const list = LocalStorageEngine.get("parties");
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx].isDeleted = true;
        state.parties = state.parties.filter(p => p.id !== id);
      }
      LocalStorageEngine.save("parties", list);
      recordActivity("Deleted Profile", `Archived profile details for ${party.type || 'Vendor'}: "${party.name}"`);
      showNotification("Profile archived.", "info");
      toggleLoader(false);
      syncGlobalState();
    } else {
      db.collection("parties").doc(id).update({ isDeleted: true })
        .then(() => {
          state.parties = state.parties.filter(p => p.id !== id);
          recordActivity("Deleted Profile", `Archived profile details for ${party.type || 'Vendor'}: "${party.name}"`);
          showNotification("Profile archived.", "info");
          syncGlobalState();
        }).catch(err => showNotification(err.message, "error"))
          .finally(() => toggleLoader(false));
    }
  }
}

function viewPartyDetails(partyId) {
  const party = state.parties.find(p => p.id === partyId);
  if (!party) return;
  
  const isCustomer = party.type === 'Customer';
  
  document.getElementById("party-detail-title").innerText = `${isCustomer ? 'Customer' : 'Vendor'} Details: ${party.name}`;
  document.getElementById("party-detail-mobile").innerText = party.mobile || "--";
  document.getElementById("party-detail-gst").innerText = party.gst || "--";
  document.getElementById("party-detail-address").innerText = party.address || "--";
  
  const typeBadgeNode = document.getElementById("party-detail-type-badge");
  if (typeBadgeNode) {
    typeBadgeNode.innerText = isCustomer ? 'Customer' : 'Vendor';
    typeBadgeNode.className = `badge mb-3 fs-6 ${isCustomer ? 'text-dark' : 'text-white'}`;
    typeBadgeNode.style.backgroundColor = isCustomer ? 'var(--freskey-color-3)' : 'var(--freskey-color-5)';
  }
  
  document.getElementById("party-detail-total-billed-label").innerText = isCustomer ? "TOTAL SALES (INVOICES)" : "TOTAL PURCHASES (BILLS)";
  document.getElementById("party-detail-total-payments-label").innerText = isCustomer ? "TOTAL RECEIVED" : "TOTAL PAID";
  document.getElementById("party-detail-outstanding-label").innerText = isCustomer ? "DUES LEFT (THEY OWE)" : "OUTSTANDING (WE OWE)";

  const oVal = (party.totalBills || 0) - (party.totalPayments || 0);
  document.getElementById("party-detail-total-bills").innerText = formatCurrency(party.totalBills || 0);
  document.getElementById("party-detail-total-payments").innerText = formatCurrency(party.totalPayments || 0);
  document.getElementById("party-detail-outstanding").innerText = formatCurrency(oVal);
  
  const activeBills = state.bills.filter(b => b.partyId === partyId);
  const activePayments = state.payments.filter(p => p.partyId === partyId);
  
  const txList = [];
  activeBills.forEach(b => {
    const actType = isCustomer ? `Sales Invoice (#${b.billNumber})` : `Purchase Bill (#${b.billNumber})`;
    txList.push({ date: b.billDate, type: actType, db: b.totalAmount, cr: 0 });
  });
  activePayments.forEach(p => {
    const actType = isCustomer ? `Payment Received (${p.mode})` : `Payment Settled (${p.mode})`;
    txList.push({ date: p.paymentDate, type: actType, db: 0, cr: p.amount });
  });
  
  txList.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  const tbodyHTML = [];
  txList.slice(0, 10).forEach(tx => {
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
    tbodyHTML.push(`<tr><td colspan="4" class="text-center text-muted small">No recent statement records to show.</td></tr>`);
  }
  
  document.getElementById("party-detail-transactions-tbody").innerHTML = tbodyHTML.join("");
  const modal = getModalInstance("modal-party-details");
  if (modal) modal.show();
}

// ==========================================
// CRUD OPERATIONS: BILLS SUBMISSIONS & CALCS
// ==========================================
function createItemRow(name = "", qty = 1, rate = 0) {
  const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
  const rowHTML = `
    <tr class="item-calc-row" id="${rowId}">
      <td><input type="text" class="form-control form-control-sm item-name-field" value="${escapeHTML(name)}" placeholder="Item/Product description" required></td>
      <td><input type="number" min="1" class="form-control form-control-sm item-qty-field" value="${qty}" required></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm item-rate-field" value="${rate}" required></td>
      <td><input type="number" class="form-control form-control-sm item-total-field bg-light border-0 fw-bold" value="${(qty * rate).toFixed(2)}" readonly></td>
      <td class="text-center"><button type="button" class="btn btn-outline-danger btn-sm p-1 lh-1" onclick="removeItemRow('${rowId}')"><i class="bi bi-x-lg"></i></button></td>
    </tr>
  `;
  
  const dNode = document.createElement("tbody");
  dNode.innerHTML = rowHTML;
  const DOMNode = getDOM();
  if (DOMNode.billItemsTbody) {
    DOMNode.billItemsTbody.appendChild(dNode.firstElementChild);
    attachRowListeners();
  }
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
    
    qtyInput.oninput = () => {
      const q = parseFloat(qtyInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      totalInput.value = (q * r).toFixed(2);
      recomputeGrandTotals();
    };
    
    rateInput.oninput = () => {
      const q = parseFloat(qtyInput.value) || 0;
      const r = parseFloat(rateInput.value) || 0;
      totalInput.value = (q * r).toFixed(2);
      recomputeGrandTotals();
    };
  });
}

function recomputeGrandTotals() {
  let subtotal = 0;
  document.querySelectorAll(".item-total-field").forEach(input => {
    subtotal += parseFloat(input.value) || 0;
  });
  const DOMNode = getDOM();
  if (DOMNode.billItemsGrandTotal) {
    DOMNode.billItemsGrandTotal.innerText = formatCurrency(subtotal);
  }
}

function openBillModal() {
  document.getElementById("bill-form-id").value = "";
  const DOMNode = getDOM();
  if (DOMNode.billForm) DOMNode.billForm.reset();
  if (DOMNode.billItemsTbody) DOMNode.billItemsTbody.innerHTML = "";
  
  const billFormDate = document.getElementById("bill-form-date");
  const billFormDueDate = document.getElementById("bill-form-due-date");
  if (billFormDate) billFormDate.value = new Date().toISOString().substring(0, 10);
  if (billFormDueDate) billFormDueDate.value = new Date(Date.now() + 15 * 86400000).toISOString().substring(0, 10);
  
  createItemRow("", 1, 0);
  const titleEl = document.getElementById("modal-bill-title");
  if (titleEl) titleEl.innerText = "Add Bill / Invoice Document";
  
  const modal = getModalInstance("modal-bill");
  if (modal) modal.show();
}

function editBill(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  
  document.getElementById("bill-form-id").value = bill.id;
  document.getElementById("bill-form-number").value = bill.billNumber;
  document.getElementById("bill-form-party-id").value = bill.partyId;
  document.getElementById("bill-form-date").value = bill.billDate;
  document.getElementById("bill-form-due-date").value = bill.dueDate;
  
  const DOMNode = getDOM();
  if (DOMNode.billItemsTbody) DOMNode.billItemsTbody.innerHTML = "";
  if (bill.items && bill.items.length > 0) {
    bill.items.forEach(it => {
      createItemRow(it.name, it.quantity, it.rate);
    });
  } else {
    createItemRow("", 1, 0);
  }
  
  recomputeGrandTotals();
  document.getElementById("modal-bill-title").innerText = `Edit Document (#${bill.billNumber})`;
  const modal = getModalInstance("modal-bill");
  if (modal) modal.show();
}

function handleBillSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById("bill-form-id").value;
  const billNumber = document.getElementById("bill-form-number").value.trim();
  const partyId = document.getElementById("bill-form-party-id").value;
  const billDate = document.getElementById("bill-form-date").value;
  const dueDate = document.getElementById("bill-form-due-date").value;
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) {
    showNotification("Party selection missing.", "error");
    return;
  }
  
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
    showNotification("Product description labels cannot be empty.", "error");
    return;
  }
  
  const totalAmount = items.reduce((acc, current) => acc + current.amount, 0);
  toggleLoader(true);
  
  const payload = {
    billNumber, partyId, partyName: party.name, partyType: party.type || 'Customer',
    billDate, dueDate, items, totalAmount,
    updatedAt: new Date().toISOString()
  };
  
  const isCust = party.type === 'Customer';
  const labelText = isCust ? 'Customer Invoice' : 'Purchase Bill';
  
  if (isSandboxMode) {
    const billList = LocalStorageEngine.get("bills");
    const partyList = LocalStorageEngine.get("parties");
    const pIdx = partyList.findIndex(p => p.id === partyId);
    
    if (id) {
      const oldBillIdx = billList.findIndex(b => b.id === id);
      const oldBill = billList[oldBillIdx];
      const diffTotal = totalAmount - oldBill.totalAmount;
      
      billList[oldBillIdx] = { ...oldBill, ...payload };
      state.bills[oldBillIdx] = billList[oldBillIdx];
      
      if (pIdx !== -1) {
        partyList[pIdx].totalBills = Number(partyList[pIdx].totalBills || 0) + diffTotal;
        state.parties[pIdx].totalBills = partyList[pIdx].totalBills;
      }
      recordActivity("Modified Invoice Details", `Updated ${labelText} #${billNumber} for "${party.name}". Net change: ${formatCurrency(diffTotal)}`);
      showNotification(`${labelText} #${billNumber} updated.`, "success");
    } else {
      payload.id = 'b_' + Math.random().toString(36).substr(2, 9);
      payload.isDeleted = false;
      payload.createdAt = new Date().toISOString();
      
      billList.push(payload);
      state.bills.push(payload);
      
      if (pIdx !== -1) {
        partyList[pIdx].totalBills = Number(partyList[pIdx].totalBills || 0) + totalAmount;
        state.parties[pIdx].totalBills = partyList[pIdx].totalBills;
      }
      recordActivity("Created Invoice Record", `Recorded ${labelText} #${billNumber} for "${party.name}". Total: ${formatCurrency(totalAmount)}`);
      showNotification(`${labelText} #${billNumber} recorded successfully.`, "success");
    }
    
    LocalStorageEngine.save("bills", billList);
    LocalStorageEngine.save("parties", partyList);
    
    toggleLoader(false);
    const modal = getModalInstance("modal-bill");
    if (modal) modal.hide();
    syncGlobalState();
  } else {
    const dbRef = db.collection("bills");
    if (id) {
      const oldBill = state.bills.find(b => b.id === id);
      const diffTotal = totalAmount - oldBill.totalAmount;
      
      dbRef.doc(id).update({
        ...payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(async () => {
        const uBillsSum = Number(party.totalBills || 0) + diffTotal;
        
        await db.collection("parties").doc(partyId).update({
          totalBills: uBillsSum
        });
        
        const partyIdx = state.parties.findIndex(p => p.id === partyId);
        if (partyIdx !== -1) {
          state.parties[partyIdx].totalBills = uBillsSum;
        }
        
        const idx = state.bills.findIndex(b => b.id === id);
        if (idx !== -1) state.bills[idx] = { ...state.bills[idx], ...payload };
        
        recordActivity("Modified Invoice Details", `Updated ${labelText} #${billNumber} for "${party.name}". Net change: ${formatCurrency(diffTotal)}`);
        showNotification(`${labelText} #${billNumber} updated.`, "success");
        const modal = getModalInstance("modal-bill");
        if (modal) modal.hide();
        syncGlobalState();
      }).catch(err => showNotification(err.message, "error"))
        .finally(() => toggleLoader(false));
    } else {
      const completePayload = {
        ...payload,
        isDeleted: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      dbRef.add(completePayload).then(async docRef => {
        completePayload.id = docRef.id;
        state.bills.push(completePayload);
        
        const uBillsSum = Number(party.totalBills || 0) + totalAmount;
        await db.collection("parties").doc(partyId).update({
          totalBills: uBillsSum
        });
        
        const partyIdx = state.parties.findIndex(p => p.id === partyId);
        if (partyIdx !== -1) {
          state.parties[partyIdx].totalBills = uBillsSum;
        }
        
        recordActivity("Created Invoice Record", `Recorded ${labelText} #${billNumber} for "${party.name}". Total: ${formatCurrency(totalAmount)}`);
        showNotification(`${labelText} #${billNumber} recorded successfully.`, "success");
        const modal = getModalInstance("modal-bill");
        if (modal) modal.hide();
        syncGlobalState();
      }).catch(err => showNotification(err.message, "error"))
        .finally(() => toggleLoader(false));
    }
  }
}

function deleteBill(id) {
  const bill = state.bills.find(b => b.id === id);
  if (!bill) return;
  
  if (confirm(`Remove Bill/Invoice #${bill.billNumber} from archives?`)) {
    toggleLoader(true);
    const isCust = bill.partyType === 'Customer';
    const labelText = isCust ? 'Invoice' : 'Bill';

    if (isSandboxMode) {
      const billList = LocalStorageEngine.get("bills");
      const partyList = LocalStorageEngine.get("parties");
      
      const bIdx = billList.findIndex(b => b.id === id);
      if (bIdx !== -1) {
        billList[bIdx].isDeleted = true;
        state.bills = state.bills.filter(b => b.id !== id);
      }
      
      const pIdx = partyList.findIndex(p => p.id === bill.partyId);
      if (pIdx !== -1) {
        partyList[pIdx].totalBills = Math.max(0, Number(partyList[pIdx].totalBills || 0) - bill.totalAmount);
        state.parties[pIdx].totalBills = partyList[pIdx].totalBills;
      }
      
      LocalStorageEngine.save("bills", billList);
      LocalStorageEngine.save("parties", partyList);
      
      recordActivity(`Deleted ${labelText}`, `Removed ${labelText} #${bill.billNumber} for "${bill.partyName}". Adjusted ${formatCurrency(bill.totalAmount)} balance.`);
      showNotification(`${labelText} removed.`, "info");
      toggleLoader(false);
      syncGlobalState();
    } else {
      db.collection("bills").doc(id).update({ isDeleted: true })
        .then(async () => {
          const party = state.parties.find(p => p.id === bill.partyId);
          if (party) {
            const uBillsSum = Math.max(0, Number(party.totalBills || 0) - bill.totalAmount);
            await db.collection("parties").doc(bill.partyId).update({
              totalBills: uBillsSum
            });
            const partyIdx = state.parties.findIndex(p => p.id === bill.partyId);
            if (partyIdx !== -1) {
              state.parties[partyIdx].totalBills = uBillsSum;
            }
          }
          state.bills = state.bills.filter(b => b.id !== id);
          recordActivity(`Deleted ${labelText}`, `Removed ${labelText} #${bill.billNumber} for "${bill.partyName}". Adjusted ${formatCurrency(bill.totalAmount)} balance.`);
          showNotification(`${labelText} removed.`, "info");
          syncGlobalState();
        }).catch(err => showNotification(err.message, "error"))
          .finally(() => toggleLoader(false));
    }
  }
}

// ==========================================
// CRUD OPERATIONS: PAYMENTS SUBMISSIONS
// ==========================================
function openPaymentModal() {
  document.getElementById("payment-form-id").value = "";
  const DOMNode = getDOM();
  if (DOMNode.paymentForm) DOMNode.paymentForm.reset();
  
  const paymentFormDate = document.getElementById("payment-form-date");
  if (paymentFormDate) paymentFormDate.value = new Date().toISOString().substring(0, 10);
  
  const titleEl = document.getElementById("modal-payment-title");
  if (titleEl) titleEl.innerText = "Record Payment Transaction";
  
  const modal = getModalInstance("modal-payment");
  if (modal) modal.show();
}

function handlePaymentSubmit(e) {
  e.preventDefault();
  
  const partyId = document.getElementById("payment-form-party-id").value;
  const paymentDate = document.getElementById("payment-form-date").value;
  const amount = parseFloat(document.getElementById("payment-form-amount").value) || 0;
  const mode = document.getElementById("payment-form-mode").value;
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) {
    showNotification("Party identification error.", "error");
    return;
  }
  
  toggleLoader(true);
  
  const payload = {
    partyId, partyName: party.name, partyType: party.type || 'Customer',
    paymentDate, amount, mode,
    isDeleted: false,
    createdAt: new Date().toISOString()
  };
  
  const isCust = party.type === 'Customer';
  const labelText = isCust ? 'Payment Received' : 'Payment Disbursed';
  
  if (isSandboxMode) {
    const payList = LocalStorageEngine.get("payments");
    const partyList = LocalStorageEngine.get("parties");
    const pIdx = partyList.findIndex(p => p.id === partyId);
    
    payload.id = 'pay_' + Math.random().toString(36).substr(2, 9);
    payList.push(payload);
    state.payments.push(payload);
    
    if (pIdx !== -1) {
      partyList[pIdx].totalPayments = Number(partyList[pIdx].totalPayments || 0) + amount;
      state.parties[pIdx].totalPayments = partyList[pIdx].totalPayments;
    }
    
    LocalStorageEngine.save("payments", payList);
    LocalStorageEngine.save("parties", partyList);
    
    recordActivity("Logged Remittance", `${labelText} of ${formatCurrency(amount)} via ${mode} for "${party.name}"`);
    showNotification(`Payment of ${formatCurrency(amount)} logged.`, "success");
    toggleLoader(false);
    const modal = getModalInstance("modal-payment");
    if (modal) modal.hide();
    syncGlobalState();
  } else {
    const completePayload = {
      ...payload,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection("payments").add(completePayload).then(async docRef => {
      completePayload.id = docRef.id;
      state.payments.push(completePayload);
      
      const uPaymentsSum = Number(party.totalPayments || 0) + amount;
      await db.collection("parties").doc(partyId).update({
        totalPayments: uPaymentsSum
      });
      
      const partyIdx = state.parties.findIndex(p => p.id === partyId);
      if (partyIdx !== -1) {
        state.parties[partyIdx].totalPayments = uPaymentsSum;
      }
      
      recordActivity("Logged Remittance", `${labelText} of ${formatCurrency(amount)} via ${mode} for "${party.name}"`);
      showNotification(`Payment of ${formatCurrency(amount)} logged.`, "success");
      const modal = getModalInstance("modal-payment");
      if (modal) modal.hide();
      syncGlobalState();
    }).catch(err => showNotification(err.message, "error"))
      .finally(() => toggleLoader(false));
  }
}

function deletePayment(id) {
  const payment = state.payments.find(p => p.id === id);
  if (!payment) return;
  
  if (confirm(`Reverse this payment transaction of ${formatCurrency(payment.amount)} for "${payment.partyName}"? Dues will be updated.`)) {
    toggleLoader(true);
    const isCust = payment.partyType === 'Customer';
    const labelText = isCust ? 'received' : 'disbursed';

    if (isSandboxMode) {
      const payList = LocalStorageEngine.get("payments");
      const partyList = LocalStorageEngine.get("parties");
      
      const pyIdx = payList.findIndex(p => p.id === id);
      if (pyIdx !== -1) {
        payList[pyIdx].isDeleted = true;
        state.payments = state.payments.filter(p => p.id !== id);
      }
      
      const pIdx = partyList.findIndex(p => p.id === payment.partyId);
      if (pIdx !== -1) {
        partyList[pIdx].totalPayments = Math.max(0, Number(partyList[pIdx].totalPayments || 0) - payment.amount);
        state.parties[pIdx].totalPayments = partyList[pIdx].totalPayments;
      }
      
      LocalStorageEngine.save("payments", payList);
      LocalStorageEngine.save("parties", partyList);
      
      recordActivity("Reversed Remittance", `Voided payment of ${formatCurrency(payment.amount)} ${labelText} to/from "${payment.partyName}"`);
      showNotification("Payment transaction reversed.", "info");
      toggleLoader(false);
      syncGlobalState();
    } else {
      db.collection("payments").doc(id).update({ isDeleted: true })
        .then(async () => {
          const party = state.parties.find(p => p.id === payment.partyId);
          if (party) {
            const uPaymentsSum = Math.max(0, Number(party.totalPayments || 0) - payment.amount);
            await db.collection("parties").doc(payment.partyId).update({
              totalPayments: uPaymentsSum
            });
            const partyIdx = state.parties.findIndex(p => p.id === payment.partyId);
            if (partyIdx !== -1) {
              state.parties[partyIdx].totalPayments = uPaymentsSum;
            }
          }
          state.payments = state.payments.filter(p => p.id !== id);
          recordActivity("Reversed Remittance", `Voided payment of ${formatCurrency(payment.amount)} ${labelText} to/from "${payment.partyName}"`);
          showNotification("Payment transaction reversed.", "info");
          syncGlobalState();
        }).catch(err => showNotification(err.message, "error"))
          .finally(() => toggleLoader(false));
    }
  }
}

// ==========================================
// ACCOUNT STATEMENT LEDGER GENERATION
// ==========================================
function generateLedgerAudit() {
  const DOMNode = getDOM();
  const partyId = DOMNode.ledgerPartySelect.value;
  if (!partyId) {
    showNotification("Please select a vendor or customer party.", "info");
    return;
  }
  
  const party = state.parties.find(p => p.id === partyId);
  if (!party) return;
  
  const isCust = party.type === 'Customer';
  
  document.getElementById("ledger-headline-title").innerText = `${isCust ? 'CUSTOMER' : 'SUPPLIER'} STATEMENT LEDGER`;
  document.getElementById("ledger-col-debit").innerText = isCust ? "Debit (Invoice Sales) (₹)" : "Debit (Purchase Bills) (₹)";
  document.getElementById("ledger-col-credit").innerText = isCust ? "Credit (Payments Received) (₹)" : "Credit (Payments Settled) (₹)";
  document.getElementById("ledger-col-balance").innerText = isCust ? "Dues Left (They Owe) (₹)" : "Outstanding (We Owe) (₹)";

  const partyBills = state.bills.filter(b => b.partyId === partyId);
  const partyPayments = state.payments.filter(p => p.partyId === partyId);
  
  const journal = [];
  
  partyBills.forEach(b => {
    journal.push({
      date: b.billDate,
      desc: isCust ? `Sales Invoice Bill #${b.billNumber}` : `Purchase Invoice Bill #${b.billNumber}`,
      debit: b.totalAmount,
      credit: 0
    });
  });
  
  partyPayments.forEach(p => {
    journal.push({
      date: p.paymentDate,
      desc: isCust ? `Payment Received (${p.mode})` : `Payment Settled via ${p.mode}`,
      debit: 0,
      credit: p.amount
    });
  });
  
  journal.sort((a,b) => new Date(a.date) - new Date(b.date));
  
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
        <td class="text-end fw-bold ${balance > 0 ? (isCust ? 'text-primary' : 'text-danger') : 'text-success'}">${formatCurrency(balance)}</td>
      </tr>
    `);
  });
  
  if (journal.length === 0) {
    tbodyHTML.push(`<tr><td colspan="5" class="text-center text-muted">No journal transactions on record for this timeline.</td></tr>`);
    DOMNode.btnPrintLedger.disabled = true;
    DOMNode.btnDownloadLedger.disabled = true;
  } else {
    DOMNode.btnPrintLedger.disabled = false;
    DOMNode.btnDownloadLedger.disabled = false;
  }
  
  DOMNode.ledgerGenDate.innerText = new Date().toLocaleString();
  DOMNode.ledgerCompName.innerText = party.name.toUpperCase();
  DOMNode.ledgerCompInfo.innerText = `Mobile: ${party.mobile} | GSTIN Reference: ${party.gst || 'N/A'}`;
  
  DOMNode.ledgerTbody.innerHTML = tbodyHTML.join("");
  document.getElementById("print-area").classList.remove("d-none");
}

// ==========================================
// EXCEL-COMPATIBLE LEDGER STATEMENT CSV DOWNLOAD [1]
// ==========================================
function downloadLedgerCSV() {
  const DOMNode = getDOM();
  const partyId = DOMNode.ledgerPartySelect.value;
  const party = state.parties.find(p => p.id === partyId);
  if (!party) return;
  
  const partyBills = state.bills.filter(b => b.partyId === partyId);
  const partyPayments = state.payments.filter(p => p.partyId === partyId);
  
  const journal = [];
  const isCust = party.type === 'Customer';
  
  partyBills.forEach(b => {
    journal.push({
      date: b.billDate,
      desc: isCust ? `Sales Invoice #${b.billNumber}` : `Purchase Bill #${b.billNumber}`,
      debit: b.totalAmount,
      credit: 0
    });
  });
  
  partyPayments.forEach(p => {
    journal.push({
      date: p.paymentDate,
      desc: isCust ? `Payment Received (${p.mode})` : `Payment Settled via ${p.mode}`,
      debit: 0,
      credit: p.amount
    });
  });
  
  journal.sort((a,b) => new Date(a.date) - new Date(b.date));
  
  const csvRows = [];
  csvRows.push(`Statement for: ${party.name.replace(/,/g, '')} (${party.type || 'Customer'})`);
  csvRows.push(`Contact: ${party.mobile || ''}, GST: ${party.gst || ''}`);
  csvRows.push(`Generated: ${new Date().toLocaleString()}`);
  csvRows.push("");
  csvRows.push("Date,Description,Debit (Bills),Credit (Payments),Outstanding Balance");
  
  let balance = 0;
  journal.forEach(txn => {
    balance += (txn.debit - txn.credit);
    csvRows.push([
      txn.date,
      `"${txn.desc.replace(/"/g, '""')}"`,
      txn.debit || 0,
      txn.credit || 0,
      balance
    ].join(","));
  });
  
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Freskey_Statement_${party.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  recordActivity("Downloaded Statement", `Downloaded CSV ledger statement for: "${party.name}"`);
}

// ==========================================
// STRING ESCAPE & UTILITIES
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

// ==========================================
// EXPOSE GLOBAL ATTRIBUTES FOR DOM BINDINGS (CRITICAL FOR MOBILE BUTTON INTERACTIVITY)
// ==========================================
window.switchView = switchView;
window.openPartyModal = openPartyModal;
window.editParty = editParty;
window.deleteParty = deleteParty;
window.viewPartyDetails = viewPartyDetails;
window.openBillModal = openBillModal;
window.editBill = editBill;
window.deleteBill = deleteBill;
window.removeItemRow = removeItemRow;
window.openPaymentModal = openPaymentModal;
window.deletePayment = deletePayment;
