# City Explorer Controller using MicroBit Buttons Only
# Button A: Turn (continuous while held) - works in both regular and tank mode
# Button B: Move forward (continuous while held for tank mode, step events for regular mode)

from microbit import *

# Button state tracking for edge detection on B only (for regular mode)
button_b_prev = False

while True:
    # Check current button states
    a_current = button_a.is_pressed()
    b_current = button_b.is_pressed()
    
    # Button A: Send continuous state (for turning)
    a_state = 1 if a_current else 0
    
    # Button B: Send both event (for regular mode) and state (for tank mode)
    # The JavaScript will use the appropriate one based on current mode
    b_pressed = b_current and not button_b_prev
    b_event = 1 if b_pressed else 0
    b_state = 1 if b_current else 0
    
    # Send as comma-separated values: button_a_state,button_b_state
    # Changed to send B state instead of B event for tank mode compatibility
    print("{},{}".format(a_state, b_state))
    
    # Update previous state for button B
    button_b_prev = b_current
    
    sleep(50)  # 20 times per second