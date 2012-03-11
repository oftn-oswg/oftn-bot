module Environment where

import           Prelude
import           Control.Applicative
import           Control.Arrow
import qualified Control.Exception as E
import           Control.Monad
import           Control.Monad.Fix
import           Control.Monad.Reader
import           Control.Monad.State
import           Control.Monad.Trans
import           Control.Monad.Writer
import           Control.Parallel
import           Data.Bits
import qualified Data.ByteString.Lazy as B
import           Data.Char
import           Data.Complex
import           Data.Function
import           Data.Functor
import           Data.List
import           Data.Map (Map)
import qualified Data.Map as Map
import           Data.Maybe
import           Data.Monoid
import           Data.Ratio
import           Data.Set (Set)
import qualified Data.Set as Set
import           Data.Typeable
import           Data.Word
import           Numeric
import           System
import           System.IO
import           System.Process
import           System.Random
import           Text.Printf
import           Text.Regex
import           Text.Show.Functions

instance Typeable a => Show (IO a) where
  show io = '<' : show (typeOf io) ++ ">"

data PutStr = PutStr String

instance Show PutStr where
  show (PutStr s) = s
