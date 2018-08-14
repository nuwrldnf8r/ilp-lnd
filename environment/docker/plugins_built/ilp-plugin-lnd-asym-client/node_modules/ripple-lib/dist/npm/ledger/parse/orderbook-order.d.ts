import { BookOffer } from '../../common/types/commands';
import { Amount, FormattedOrderSpecification } from '../../common/types/objects';
export declare type FormattedOrderbookOrder = {
    specification: FormattedOrderSpecification;
    properties: {
        maker: string;
        sequence: number;
        makerExchangeRate: string;
    };
    state?: {
        fundedAmount: Amount;
        priceOfFundedAmount: Amount;
    };
};
export declare function parseOrderbookOrder(order: BookOffer): FormattedOrderbookOrder;
