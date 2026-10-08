# OCR dependencies

- Tesseract.js 5.1.1: npm package `tesseract.js@5.1.1`, bundled browser and worker builds, Apache-2.0 (TESSERACT-JS-LICENSE).
- Tesseract.js-core 5.1.1: npm package `tesseract.js-core@5.1.1`, SIMD and non-SIMD LSTM WebAssembly builds, Apache-2.0 (CORE-LICENSE).
- Tesseract official tessdata_fast repository: https://github.com/tesseract-ocr/tessdata_fast, commit `87416418657359cb625c412a48b6e1d6d41c29bd`, `chi_tra`, `chi_sim`, `eng` models. Apache-2.0 (TESSDATA-LICENSE).

Packages were downloaded with npm pack; models were downloaded over verified HTTPS from the exact official Git commit above. No TLS, checksum, or signature verification was disabled. See SHA256SUMS for retained file hashes.
