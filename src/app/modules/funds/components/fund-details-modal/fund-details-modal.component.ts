import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { Store, select } from '@ngrx/store';

import { Fund } from '@models/fund.model';
import { User, InvestedFund } from '@models/user.model';

import { AppState } from '@core/store/app.state';
import { getCurrentUser } from '@state/selectors/user.selectors';
import { updateUser } from '@core/store/actions/user.actions';

@Component({
  selector: 'app-fund-details-modal',
  templateUrl: './fund-details-modal.component.html',
  styleUrls: ['./fund-details-modal.component.scss']
})
export class FundDetailsModalComponent implements OnInit {
  formatLabel(value: number): string {
    if (value >= 1000) {
      return Math.round(value / 1000) + 'k';
    }
    return `${value}`;
  }

  currentUser!: User;
  currentUser$!: Observable<User | null>;
  investmentAmount: number = 0;
  investedFund: InvestedFund | undefined;
  maxInvestmentAmount: number = 0;
  selectedFund: Fund;
  showInvestmentForm: boolean = false;



  constructor(
    public dialogRef: MatDialogRef<FundDetailsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Fund,
    private store: Store<AppState>
  ) {
    this.selectedFund = data;
  }

  ngOnInit(): void {
    this._loadUser();
  }

  private _loadUser(): void {
    this.currentUser$ = this.store.pipe(
      select(getCurrentUser)
    );
    this.currentUser$.subscribe(user => {
      if (user) {
        this.currentUser = user;
        this._findInvestedFund();
      }
    });
  }

  private _findInvestedFund(): void {
    this.investedFund = this.currentUser.wallet.investedFunds.find(fund => fund.fundId === this.selectedFund.id);
  }

  calculateMaxInvestmentAmount(): number {
    return this.selectedFund.maximumValue > this.currentUser.wallet.currentBalance ?
      this.currentUser.wallet.currentBalance : this.selectedFund.maximumValue;
  }

  isFundInWallet(): boolean {
    return this.investedFund !== undefined;
  }

  getRemainingTime(): string {
    if (this.investedFund && this.investedFund.withdrawalDate) {
      const withdrawalDate = new Date(this.investedFund.withdrawalDate);
      const currentDate = new Date();
      const remainingDays = Math.ceil((withdrawalDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
      return `${remainingDays} days left`;
    }
    return '';
  }

  getBalance(): number {
    if (this.investedFund) {
      const balance = this.investedFund.investedValue + (this.investedFund.investedValue * this.selectedFund.interest);
      return Math.round(balance);
    }
    return 0;
  }

  investInFund(): void {
    this.showInvestmentForm = true;
  }


  withdrawFromWallet(): void {
    if (this.investedFund) {
      const withdrawalAmount = this.investedFund.investedValue;
      const updatedInvestedFunds = this.currentUser.wallet.investedFunds.filter(fund => fund.fundId !== this.selectedFund.id);

      this.currentUser = { ...this.currentUser, wallet: { ...this.currentUser.wallet, investedFunds: updatedInvestedFunds } };
      this.currentUser.wallet.currentBalance += withdrawalAmount;

      this.store.dispatch(updateUser({ currentUser: this.currentUser }));
      this.close();
    }
  }

  confirmInvestment(): void {
    const investmentAmount = this.investmentAmount;

    const investedFund: InvestedFund = {
      fundId: this.selectedFund.id,
      investedValue: investmentAmount,
      currentBalance: investmentAmount,
      withdrawalDate: this._generateWithdrawalDate()
    };
    const updatedInvestedFunds = this.currentUser.wallet.investedFunds.concat(investedFund);

    this.currentUser = { ...this.currentUser, wallet: { ...this.currentUser.wallet, investedFunds: updatedInvestedFunds } };
    this.currentUser.wallet.currentBalance -= investmentAmount;

    this.store.dispatch(updateUser({ currentUser: this.currentUser }));
    this.close();
  }

  private _generateWithdrawalDate(): string {
    const currentDate = new Date();
    const randomYear = currentDate.getFullYear() + Math.floor(Math.random() * 4) + 3;
    const randomMonth = Math.floor(Math.random() * 12) + 1;
    const randomDay = Math.floor(Math.random() * 28) + 1;

    const withdrawalDate = `${randomYear}-${this.padNumber(randomMonth)}-${this.padNumber(randomDay)}`;
    return withdrawalDate;
  }

  padNumber(number: number): string {
    return number.toString().padStart(2, '0');
  }


  close(): void {
    this.dialogRef.close();
  }
}
