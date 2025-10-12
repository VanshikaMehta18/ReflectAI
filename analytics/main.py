import streamlit as st
import pandas as pd
import numpy as np

st.title('MindMirror Analytics')

st.header('Mood Timeline')

# Sample data
chart_data = pd.DataFrame(
    np.random.randn(20, 3),
    columns=['Sentiment', 'Clarity', 'Reflection'])

st.line_chart(chart_data)
