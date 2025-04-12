#!/bin/bash

# Configuration variables
PRIVATE_KEY="/users/ricoho/Documents/flash/CECMACAUflashcard.pem"
LOCAL_DIR="/users/ricoho/Documents/python/flashCard2"
REMOTE_HOST="ubuntu@ec2-13-208-190-156.ap-northeast-3.compute.amazonaws.com"
REMOTE_DIR="/home/ubuntu/flashcard"

# Predefined file sets
declare -A FILE_SETS
FILE_SETS["frontend"]="public/flashcards.js public/flashcards.html public/index.html public/style.css public/script.js"
FILE_SETS["backend"]="server/server.js"
FILE_SETS["all"]="public/flashcards.js public/flashcards.html public/index.html public/style.css public/script.js server/server.js"

# Function to transfer a single file
transfer_file() {
    local file=$1
    local local_path="${LOCAL_DIR}/${file}"
    local remote_path="${REMOTE_DIR}/${file}"
    
    echo "Transferring ${file}..."
    scp -i "${PRIVATE_KEY}" "${local_path}" "${REMOTE_HOST}:${remote_path}"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully transferred ${file}"
    else
        echo "❌ Failed to transfer ${file}"
    fi
}

# Display help message
show_help() {
    echo "Usage: $0 [options] [file1 file2 ...]"
    echo ""
    echo "Options:"
    echo "  -s, --set SET_NAME    Transfer a predefined set of files"
    echo "                        Available sets: frontend, backend, all"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 public/flashcards.js                # Transfer a single file"
    echo "  $0 public/index.html server/server.js  # Transfer multiple files"
    echo "  $0 --set frontend                      # Transfer all frontend files"
    echo "  $0 --set all                           # Transfer all files"
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    show_help
    exit 1
fi

files_to_transfer=()

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--set)
            set_name="$2"
            if [[ -z "${FILE_SETS[$set_name]}" ]]; then
                echo "Error: Unknown file set '$set_name'"
                echo "Available sets: ${!FILE_SETS[*]}"
                exit 1
            fi
            for file in ${FILE_SETS[$set_name]}; do
                files_to_transfer+=("$file")
            done
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            files_to_transfer+=("$1")
            shift
            ;;
    esac
done

# Transfer each file
for file in "${files_to_transfer[@]}"; do
    transfer_file "$file"
done

echo "All transfers completed!"