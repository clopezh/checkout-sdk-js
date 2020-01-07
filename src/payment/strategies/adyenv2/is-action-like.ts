import { AdyenV2Action } from './adyenv2';

export default function isActionLike(result: any): result is AdyenV2Action {
    return Boolean((result as AdyenV2Action));
}
