import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load backend .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
api_key = (os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or '').strip()
if not api_key:
    print('No API key found in backend/.env. Set GOOGLE_API_KEY or GEMINI_API_KEY and try again.')
    raise SystemExit(1)

genai.configure(api_key=api_key)

model = os.getenv('GEMINI_MODEL')
if not model:
    print('No GEMINI_MODEL set; please set it in backend/.env')
    raise SystemExit(2)

print('Using model:', model)
try:
    gm = genai.GenerativeModel(model)
    resp = gm.generate_content('Say hello in a single short sentence.')
    print('Generation result:')
    print(resp.text)
except Exception as e:
    print('Generation failed:', e)
    raise SystemExit(3)
