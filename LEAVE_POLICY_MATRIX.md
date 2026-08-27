# Implemented Leave Policy Matrix

| Leave | Eligibility / limit | Balance deduction | Mandatory document |
|---|---|---:|---|
| Casual | Both; max 2 days within a calendar month; no carry forward | 0 | None |
| Earned Full Pay | Both; 12+ months service | requested days | None |
| Half Pay | Both | ceil(requested days / 2) | None |
| EOL | Both | 0 | Written Request Document |
| Maternity | Female; max 90 days; max 3 approved occurrences/service | 0 | Medical certificate optional |
| Paternity | Male; max 7 days; max 2 approved occurrences/service | 0 | None |
| Ex-Pak Full Pay | Both; sufficient balance | requested days | Government Permission Letter |
| Ex-Pak Half Pay | Both; sufficient balance | ceil(days / 2) | Government Permission Letter |
| Ex-Pak EOL | Both | 0 | Government Permission Letter |
| Special Accident/Injury | Both | 0 | Medical Certificate |
| Medical Long-term | Both | 0 | Medical Certificate |
| Special Quarantine | Both | 0 | Quarantine Order |
| LPR | Age >=59 and <60 at leave start; max 365 days; sufficient balance | requested days | None |
| Study Full Pay | Both; 5+ years service; max 730 days; sufficient balance | requested days | Admission Letter |
| Study Half Pay | Both; 5+ years service; max 730 days; sufficient balance | ceil(days / 2) | Admission Letter |
| Study EOL | Both; 5+ years service; max 730 days | 0 | Admission Letter |

## Deliberately isolated policy extensions
The supplied rule sheet also mentions constraints such as maternity pregnancy-gap certification, duty injury semantics, quarantine duty-for-pay, pension effects of half pay, and possible Study Leave extension by one year. These are not silently guessed. Add them to the corresponding engine once the exact business interpretation is approved.
