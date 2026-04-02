from fastapi import APIRouter, Query
import requests
from ....config import settings

router = APIRouter()


@router.get("/")
def convert(amount: float = Query(...), from_currency: str = Query('USD'), to_currency: str = Query('GBP')):
    # If API key is provided, try calling exchange rate API; fallback to fixed rate
    if settings.EXCHANGE_RATE_API_KEY:
        try:
            url = f"https://v6.exchangerate-api.com/v6/{settings.EXCHANGE_RATE_API_KEY}/pair/{from_currency}/{to_currency}/{amount}"
            r = requests.get(url, timeout=5)
            data = r.json()
            if data.get('result') == 'success':
                return {"converted": data.get('conversion_result'), "rate": data.get('conversion_rate')}
        except Exception:
            pass

    # fallback static rates (example)
    rates = {('USD','GBP'): 0.78, ('GBP','USD'): 1.28}
    rate = rates.get((from_currency.upper(), to_currency.upper()), 1.0)
    return {"converted": round(amount * rate, 2), "rate": rate}
