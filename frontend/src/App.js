/* ProcureFlix routes snippet with CCTV */
// ...imports above
import PfCctvView from './procureflix/PfCctvView';

// inside ProcureFlix route block
<Route
  path="/pf"
  element={
    <ProtectedRoute>
      <ProcureFlixLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<Navigate to="/pf/dashboard" replace />} />
  <Route path="dashboard" element={<PfDashboard />} />
  <Route path="vendors" element={<PfVendorsList />} />
  <Route path="vendors/:id" element={<PfVendorDetail />} />
  <Route path="tenders" element={<PfTendersList />} />
  <Route path="tenders/:id" element={<PfTenderDetail />} />
  <Route path="contracts" element={<PfContractsList />} />
  <Route path="contracts/:id" element={<PfContractDetail />} />
  <Route path="purchase-orders" element={<PfPurchaseOrdersList />} />
  <Route path="purchase-orders/:id" element={<PfPurchaseOrderDetail />} />
  <Route path="invoices" element={<PfInvoicesList />} />
  <Route path="invoices/:id" element={<PfInvoiceDetail />} />
  <Route path="resources" element={<PfResourcesList />} />
  <Route path="resources/:id" element={<PfResourceDetail />} />
  <Route path="service-requests" element={<PfServiceRequestsList />} />
  <Route path="service-requests/:id" element={<PfServiceRequestDetail />} />
  <Route path="cctv" element={<PfCctvView />} />
</Route>
