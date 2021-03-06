require('module-alias/register');
const BOBasePage = require('@pages/BO/BObasePage');

module.exports = class Order extends BOBasePage {
  constructor(page) {
    super(page);

    this.pageTitle = 'Orders •';

    // Selectors grid panel
    this.gridPanel = '#order_grid_panel';
    this.gridTable = '#order_grid_table';
    this.gridHeaderTitle = `${this.gridPanel} h3.card-header-title`;
    // Filters
    this.filterColumn = `${this.gridTable} #order_%FILTERBY`;
    this.filterSearchButton = `${this.gridTable} button[name='order[actions][search]']`;
    this.filterResetButton = `${this.gridTable} button[name='order[actions][reset]']`;
    // Table rows and columns
    this.tableBody = `${this.gridTable} tbody`;
    this.tableRow = `${this.tableBody} tr:nth-child(%ROW)`;
    this.tableEmptyRow = `${this.tableBody} tr.empty_row`;
    this.tableColumn = `${this.tableRow} td.column-%COLUMN`;
    this.tableColumnStatus = `${this.tableRow} td.column-osname`;
    this.updateStatusInTablebutton = `${this.tableColumnStatus} button`;
    this.updateStatusInTabledropdown = `${this.tableColumnStatus} div.js-choice-options`;
    this.updateStatusInTabledropdownChoice = `${this.updateStatusInTabledropdown} button[data-value='%STATUSID']`;
    // Column actions selectors
    this.actionsColumn = `${this.tableRow} td.column-actions`;
    this.viewRowLink = `${this.actionsColumn} a[data-original-title='View']`;
    this.viewInvoiceRowLink = `${this.actionsColumn} a[data-original-title='View invoice']`;
    this.viewDeliverySlipsRowLink = `${this.actionsColumn} a[data-original-title='View delivery slip']`;
    // Grid Actions
    this.gridActionButton = '#order-grid-actions-button';
    this.gridActionDropDownMenu = 'div.dropdown-menu[aria-labelledby=\'order-grid-actions-button\']';
    this.gridActionExportLink = `${this.gridActionDropDownMenu} a[href*='/export']`;
    // Bulk actions
    this.selectAllRowsLabel = `${this.gridPanel} tr.column-filters .md-checkbox i`;
    this.bulkActionsToggleButton = `${this.gridPanel} button.js-bulk-actions-btn`;
    this.bulkUpdateOrdersStatusButton = '#order_grid_bulk_action_change_order_status';
    this.tableColumnOrderBulk = `${this.tableRow} td.column-orders_bulk`;
    this.tableColumnOrderBulkCheckboxLabel = `${this.tableColumnOrderBulk} .md-checkbox i`;
    // Order status modal
    this.updateOrdersStatusModal = '#changeOrdersStatusModal';
    this.updateOrdersStatusModalSelect = '#change_orders_status_new_order_status_id';
    this.updateOrdersStatusModalButton = `${this.updateOrdersStatusModal} .modal-footer .js-submit-modal-form-btn`;
  }

  /*
  Methods
   */
  /**
   * Click on lint to export orders to a csv file
   * @return {Promise<void>}
   */
  async exportDataToCsv() {
    await Promise.all([
      this.page.click(this.gridActionButton),
      this.waitForVisibleSelector(`${this.gridActionDropDownMenu}.show`),
    ]);
    await Promise.all([
      this.page.click(this.gridActionExportLink),
      this.page.waitForSelector(`${this.gridActionDropDownMenu}.show`, {hidden: true}),
    ]);
  }

  /**
   * Filter Orders
   * @param filterType
   * @param filterBy
   * @param value
   * @return {Promise<void>}
   */
  async filterOrders(filterType, filterBy, value = '') {
    switch (filterType) {
      case 'input':
        await this.setValue(this.filterColumn.replace('%FILTERBY', filterBy), value.toString());
        break;
      case 'select':
        await this.selectByVisibleText(this.filterColumn.replace('%FILTERBY', filterBy), value);
        break;
      default:
      // Do nothing
    }
    // click on search
    await this.clickAndWaitForNavigation(this.filterSearchButton);
  }

  /**
   * Reset filter in orders
   * @return {Promise<void>}
   */
  async resetFilter() {
    if (!(await this.elementNotVisible(this.filterResetButton, 2000))) {
      await this.clickAndWaitForNavigation(this.filterResetButton);
    }
  }

  /**
   * Reset Filter And get number of elements in list
   * @return {Promise<integer>}
   */
  async resetAndGetNumberOfLines() {
    await this.resetFilter();
    return this.getNumberOfElementInGrid();
  }

  /**
   * Get number of orders in grid
   * @return {Promise<integer>}
   */
  async getNumberOfElementInGrid() {
    return this.getNumberFromText(this.gridHeaderTitle);
  }

  /**
   * Go to orders Page
   * @param orderRow
   * @return {Promise<void>}
   */
  async goToOrder(orderRow) {
    await this.clickAndWaitForNavigation(this.viewRowLink.replace('%ROW', orderRow));
  }

  /**
   * Get text from Column
   * @param columnName
   * @param row
   * @return {Promise<textContent>}
   */
  async getTextColumn(columnName, row) {
    if (columnName === 'osname') {
      return this.getTextContent(this.updateStatusInTablebutton.replace('%ROW', row));
    }
    return this.getTextContent(
      this.tableColumn
        .replace('%ROW', row)
        .replace('%COLUMN', columnName),
    );
  }

  /**
   * Get all row information from orders table
   * @param row
   * @return {Promise<object>}
   */
  async getOrderFromTable(row) {
    return {
      id: parseFloat(await this.getTextColumn('id_order', row)),
      reference: await this.getTextColumn('reference', row),
      newClient: await this.getTextColumn('new', row),
      delivery: await this.getTextColumn('country_name', row),
      customer: await this.getTextColumn('customer', row),
      totalPaid: await this.getTextColumn('total_paid_tax_incl', row),
      payment: await this.getTextColumn('payment', row),
      status: await this.getTextColumn('osname', row),
    };
  }

  /**
   * Get order from table in csv format
   * @param row
   * @return {Promise<string>}
   */
  async getOrderInCsvFormat(row) {
    const order = await this.getOrderFromTable(row);
    return `${order.id};`
      + `${order.reference};`
      + `${order.newClient === 'Yes' ? 1 : 0};`
      + `${order.delivery.split(' ').length > 1 ? `"${order.delivery}";` : `${order.delivery};`}`
      + `"${order.customer}";`
      + `${order.totalPaid};`
      + `${order.payment.split(' ').length > 1 ? `"${order.payment}";` : `${order.payment};`}`
      + `${order.status.split(' ').length > 1 ? `"${order.status}";` : `${order.status};`}`;
  }

  /**
   * Set order status
   * @param row, order row in table
   * @param status, object{id, status} from demo orderStatuses
   * @return {Promise<string>}
   */
  async setOrderStatus(row, status) {
    await Promise.all([
      this.page.click(this.updateStatusInTablebutton.replace('%ROW', row)),
      this.waitForVisibleSelector(`${this.updateStatusInTabledropdown.replace('%ROW', row)}.show`),
    ]);
    await this.clickAndWaitForNavigation(
      this.updateStatusInTabledropdownChoice
        .replace('%STATUSID', status.id)
        .replace('%ROW', row),
    );
    return this.getTextContent(this.alertSuccessBlockParagraph);
  }

  /**
   * Click on view invoice to download it
   * @param row
   * @return {Promise<void>}
   */
  async downloadInvoice(row) {
    await this.page.click(this.viewInvoiceRowLink.replace('%ROW', row));
  }

  /**
   * Click on view delivery slip to download it
   * @param row
   * @return {Promise<void>}
   */
  async downloadDeliverySlip(row) {
    await this.page.click(this.viewDeliverySlipsRowLink.replace('%ROW', row));
  }

  /**
   * Bulk change orders status
   * @param status, new status to give to orders
   * @param allOrders, true if want to change all selectors
   * @param rows, array of which orders rows to change (if allOrders = false)
   * @return {Promise<string>}
   */
  async bulkUpdateOrdersStatus(status, allOrders = true, rows = []) {
    // Select all orders or some
    if (allOrders) {
      await Promise.all([
        this.page.click(this.selectAllRowsLabel),
        this.waitForVisibleSelector(`${this.bulkActionsToggleButton}:not([disabled])`),
      ]);
    } else {
      for (let i = 0; i < rows.length; i++) {
        await this.page.click(this.tableColumnOrderBulkCheckboxLabel.replace('%ROW', rows[i]));
      }
      await this.waitForVisibleSelector(`${this.bulkActionsToggleButton}:not([disabled])`);
    }
    // Open bulk actions button
    await Promise.all([
      this.page.click(this.bulkActionsToggleButton),
      this.waitForVisibleSelector(`${this.bulkActionsToggleButton}[aria-expanded='true']`),
    ]);
    // Click on change order status button
    await Promise.all([
      this.page.click(this.bulkUpdateOrdersStatusButton),
      this.waitForVisibleSelector(`${this.updateOrdersStatusModal}:not([aria-hidden='true']`),
    ]);
    // Select new orders status in modal and confirm update
    await this.selectByVisibleText(this.updateOrdersStatusModalSelect, status);
    await this.clickAndWaitForNavigation(this.updateOrdersStatusModalButton);
    return this.getTextContent(this.alertSuccessBlockParagraph);
  }
};
