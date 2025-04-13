#!/bin/bash
cd /home/ubuntu/flashcard/public

for folder in photon mechanics material waves; do
  if [ -d "$folder/$folder" ]; then
    echo "Fixing folder: $folder"
    mv "$folder/$folder"/* "$folder/"
    rmdir "$folder/$folder"
  else
    echo "Folder $folder is fine."
  fi
done
