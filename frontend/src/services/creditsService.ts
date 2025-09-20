// Simulated server-side credits service
export interface CreditsTransaction {
  id: string;
  type: 'deduction' | 'purchase' | 'refund';
  amount: number;
  reason: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
}

export interface CreditsResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
  message: string;
}

class CreditsService {
  private baseUrl = '/api/credits'; // Simulated API endpoint
  private isOnline = true;

  // Simulate network delay
  private async delay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Simulate server-side credits deduction
  async deductCredits(amount: number, reason: string): Promise<CreditsResponse> {
    await this.delay(800); // Simulate server processing time

    // Simulate occasional network failures
    if (Math.random() < 0.05) {
      throw new Error('Network error: Unable to process credits deduction');
    }

    // Simulate server validation
    if (amount <= 0) {
      return {
        success: false,
        newBalance: 0,
        transactionId: '',
        message: 'Invalid amount: Credits must be positive'
      };
    }

    // Simulate server-side balance check
    const currentBalance = this.getCurrentBalance();
    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        transactionId: '',
        message: 'Insufficient credits: Please purchase more credits'
      };
    }

    // Simulate successful deduction
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newBalance = currentBalance - amount;

    // Store transaction in localStorage (simulating server persistence)
    this.storeTransaction({
      id: transactionId,
      type: 'deduction',
      amount,
      reason,
      timestamp: new Date(),
      status: 'completed'
    });

    return {
      success: true,
      newBalance,
      transactionId,
      message: `Successfully deducted ${amount} credits`
    };
  }

  // Simulate server-side credits purchase
  async purchaseCredits(amount: number, paymentMethod: string = 'mock'): Promise<CreditsResponse> {
    await this.delay(1200); // Simulate payment processing

    // Simulate payment validation
    if (amount <= 0 || amount > 1000) {
      return {
        success: false,
        newBalance: this.getCurrentBalance(),
        transactionId: '',
        message: 'Invalid amount: Credits must be between 1 and 1000'
      };
    }

    const transactionId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentBalance = this.getCurrentBalance();
    const newBalance = currentBalance + amount;

    // Store transaction
    this.storeTransaction({
      id: transactionId,
      type: 'purchase',
      amount,
      reason: `Credits purchase via ${paymentMethod}`,
      timestamp: new Date(),
      status: 'completed'
    });

    return {
      success: true,
      newBalance,
      transactionId,
      message: `Successfully purchased ${amount} credits`
    };
  }

  // Get current balance from localStorage (simulating server state)
  private getCurrentBalance(): number {
    const stored = localStorage.getItem('smart-research-credits');
    return stored ? parseInt(stored, 10) : 18; // Default starting balance
  }

  // Store transaction in localStorage
  private storeTransaction(transaction: CreditsTransaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem('smart-research-transactions', JSON.stringify(transactions));
  }

  // Get transaction history
  getTransactions(): CreditsTransaction[] {
    const stored = localStorage.getItem('smart-research-transactions');
    return stored ? JSON.parse(stored) : [];
  }

  // Update balance in localStorage
  updateBalance(newBalance: number): void {
    localStorage.setItem('smart-research-credits', newBalance.toString());
  }

  // Simulate server health check
  async checkServerHealth(): Promise<boolean> {
    await this.delay(300);
    return this.isOnline;
  }

  // Simulate network status changes
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }
}

export const creditsService = new CreditsService();
