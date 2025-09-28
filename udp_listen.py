import socket

def listen_for_broadcast(port):
    # Create a UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    # Set the SO_BROADCAST option to allow broadcasting
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    # Bind the socket to the port on all interfaces
    try:
        sock.bind(('', port))
        print(f"Listening for UDP broadcasts on port {port}...")
    except OSError as e:
        print(f"Error binding to port {port}: {e}")
        return

    while True:
        try:
            # Receive data
            data, address = sock.recvfrom(1024) # Buffer size 1024
            print(data.decode('UTF-8'))
            #print(f"Received message: [{data.decode('UTF-8')}] from {address}")
        except KeyboardInterrupt:
            print("\nStopped listening.")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            break

if __name__ == "__main__":
    BROADCAST_PORT = 23464 # Example broadcast port
    try:
        listen_for_broadcast(BROADCAST_PORT)
    except:
        import traceback
        traceback.print_exc()
        
