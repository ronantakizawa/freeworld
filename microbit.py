# City Explorer Controller using MicroBit Buttons Only
# Button A: Turn (continuous while held)
# Button B: Move forward (small step per press)

from microbit import *

# Button state tracking for edge detection on B only
button_b_prev = False

while True:
    # Check current button states
    a_current = button_a.is_pressed()
    b_current = button_b.is_pressed()
    
    # Button A: Send continuous state (for turning)
    a_state = 1 if a_current else 0
    
    # Button B: Detect press events only (for stepping)
    b_pressed = b_current and not button_b_prev
    b_event = 1 if b_pressed else 0
    
    # Send as comma-separated values: button_a_state,button_b_event
    print("{},{}".format(a_state, b_event))
    
    # Update previous state for button B
    button_b_prev = b_current
    
    sleep(50)  # 20 times per second