"""Employee Registration Form - Streamlit version.

No database and no authentication. State lives only in the Streamlit session.
"""

import streamlit as st

DEPARTMENTS = ["Engineering", "Finance", "Marketing", "HR"]

st.set_page_config(page_title="Employee Registration Form", layout="centered")

BASE_CSS = """
<style>
:root {
  --purple-700: #5b2a86;
  --purple-600: #6b3fa0;
  --purple-100: #efe7f8;
  --purple-50: #f7f3fc;
  --green-700: #1e6b34;
  --green-500: #2e8b47;
  --green-100: #e6f4ea;
}

.stApp { background: #f3f0f7; }

/* Main content as a single white form card with a purple top banner. */
.stMainBlockContainer, .block-container {
  max-width: 760px;
  margin-top: 2rem;
  padding: 2rem 2.25rem 2.5rem;
  background: #ffffff;
  border-radius: 12px;
  border-top: 10px solid var(--purple-600);
  box-shadow: 0 1px 3px rgba(31, 31, 31, 0.08), 0 4px 12px rgba(31, 31, 31, 0.05);
}

h1 { color: #1f1f1f; font-weight: 600 !important; }

/* Inputs: purple focus accent. */
.stTextInput input:focus,
.stTextArea textarea:focus {
  border-color: var(--purple-600) !important;
  box-shadow: 0 0 0 2px rgba(107, 63, 160, 0.35) !important;
}
div[data-baseweb="select"] > div:focus-within {
  border-color: var(--purple-600) !important;
}

/* Review section: large button-like card. */
.st-key-review_section button {
  width: 100%;
  min-height: 110px;
  border: 2px dashed var(--purple-600);
  border-radius: 12px;
  background: var(--purple-50);
  color: var(--purple-700);
}
.st-key-review_section button p {
  font-size: 1.3rem;
  font-weight: 600;
}
.st-key-review_section button:hover {
  background: var(--purple-100);
  border-color: var(--purple-700);
  color: var(--purple-700);
}
.st-key-review_section button:focus-visible {
  box-shadow: 0 0 0 3px rgba(107, 63, 160, 0.4);
}

/* Submit button: purple primary. */
.st-key-submit_button button {
  background: var(--purple-600);
  border: 1px solid var(--purple-600);
  color: #ffffff;
  padding: 0.5rem 1.75rem;
  font-weight: 600;
}
.st-key-submit_button button:hover:not(:disabled) {
  background: var(--purple-700);
  border-color: var(--purple-700);
  color: #ffffff;
}
.st-key-submit_button button:disabled {
  background: #c9c2d3;
  border-color: #c9c2d3;
  color: #4a4a4a;
}

.section-heading {
  margin: 1.25rem 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: #1f1f1f;
}
</style>
"""

OPENED_CSS = """
<style>
.st-key-review_section button,
.st-key-review_section button:hover {
  border-style: solid;
  border-color: var(--green-500);
  background: var(--green-100);
  color: var(--green-700);
}
</style>
"""

st.markdown(BASE_CSS, unsafe_allow_html=True)

if "review_opened" not in st.session_state:
    st.session_state.review_opened = False
if "submitted" not in st.session_state:
    st.session_state.submitted = False


def open_review_section():
    st.session_state.review_opened = True


def submit_form():
    if st.session_state.review_opened:
        st.session_state.submitted = True


if st.session_state.review_opened:
    st.markdown(OPENED_CSS, unsafe_allow_html=True)

st.title("Employee Registration Form")
st.caption("Complete the fields below, then open the review section to continue.")

st.text_input("Full Name", key="full_name", placeholder="Enter your answer")
st.text_input("Work Email", key="work_email", placeholder="name@company.com")
st.selectbox(
    "Department",
    DEPARTMENTS,
    index=None,
    placeholder="Select your answer",
    key="department",
)

st.button(
    "Review your information",
    key="review_section",
    on_click=open_review_section,
    help="Click to open Additional Details",
)

if st.session_state.review_opened:
    with st.container(key="review_success"):
        st.success("Review section opened successfully.")

    st.markdown('<p class="section-heading">Additional Details</p>', unsafe_allow_html=True)
    st.text_input("Location", key="location", placeholder="Enter your answer")
    st.text_area("Comments", key="comments", placeholder="Enter your answer")

st.button(
    "Submit",
    key="submit_button",
    on_click=submit_form,
    disabled=not st.session_state.review_opened,
)

if st.session_state.submitted:
    with st.container(key="submit_success"):
        st.success("Form submitted successfully.")
