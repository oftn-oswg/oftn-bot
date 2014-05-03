all: shovel.bin

shovel.bin: shovel.cpp
	g++ $^ `pkg-config v8 --libs --cflags` -o $@ -O3 -g -Wall -Wextra -pedantic -mtune=native

test:
	LD_LIBRARY_PATH=/usr/local/lib ./shovel '../../../oftnbot-utils.js'

debug:
	LD_LIBRARY_PATH=/usr/local/lib gdb ./shovel

clean:
	rm -rfv shovel.bin
